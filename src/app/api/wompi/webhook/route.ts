import { NextRequest, NextResponse } from "next/server";
import { verifyEventChecksum } from "@/lib/wompi";
import { findCatalogItem, parseReference } from "@/lib/orders";
import {
  findPagoByReferencia,
  updatePagoEstado,
  claimPagoAprobado,
  claimPagoRevertido,
  type PagoEstado,
} from "@/lib/pagos";
import { addCreditsByEmail, deductCreditsByEmail, getUserCreditsByEmail } from "@/lib/users";
import { sendMetaPurchaseEvent } from "@/lib/meta-conversions-api";
import {
  getSubscriptionByEmail,
  upsertSubscription,
  markSubscriptionRenewed,
  cancelSubscription,
} from "@/lib/subscriptions";
import { facturarCompra } from "@/lib/billing";
import { sendOpsAlertEmail } from "@/lib/email";

const OWNER_EMAIL = "uniqueappcol@gmail.com";

function statusToEstado(status: string): PagoEstado {
  if (status === "APPROVED") return "Aprobado";
  if (status === "DECLINED" || status === "VOIDED" || status === "ERROR") return "Rechazado";
  return "Pendiente";
}

export async function POST(req: NextRequest) {
  const payload = await req.json();

  if (!verifyEventChecksum(payload)) {
    return NextResponse.json({ error: "checksum inválido" }, { status: 400 });
  }

  if (payload.event !== "transaction.updated") {
    return NextResponse.json({ ok: true });
  }

  const tx = payload.data?.transaction;
  if (!tx?.reference || !tx.id || !tx.status) {
    return NextResponse.json({ ok: true });
  }

  const parsed = parseReference(tx.reference);
  if (!parsed) return NextResponse.json({ ok: true });

  const item = findCatalogItem(parsed.kind, parsed.itemId);
  if (!item || item.price * 100 !== tx.amount_in_cents) {
    // El monto no coincide con el catálogo — no acreditamos por seguridad.
    return NextResponse.json({ ok: true });
  }

  const pago = await findPagoByReferencia(tx.reference);
  if (!pago) return NextResponse.json({ ok: true });

  const nextEstado = statusToEstado(tx.status);

  if (nextEstado !== "Aprobado") {
    // Un rechazo/pendiente no acredita nada — pero no pises un pago que ya
    // haya quedado "Aprobado" (ej. reintento del webhook fuera de orden).
    if (pago.estado !== "Aprobado") {
      await updatePagoEstado(pago.id, nextEstado, tx.id);
      return NextResponse.json({ ok: true });
    }
    // El pago ya estaba "Aprobado" (créditos ya dados) y ahora llega
    // anulado — solo VOIDED es una señal explícita de reversión real (ej.
    // reembolso manual desde el dashboard de Wompi); un DECLINED/ERROR
    // tardío sobre un pago ya aprobado casi siempre es un webhook fuera de
    // orden, no debe revertir nada.
    if (tx.status === "VOIDED") {
      const revertido = await claimPagoRevertido(pago.referencia, tx.id);
      if (revertido) {
        await deductCreditsByEmail(revertido.correo, revertido.creditos);
        if (revertido.tipo === "plan") await cancelSubscription(revertido.correo);
        await sendOpsAlertEmail({
          ownerEmail: OWNER_EMAIL,
          asunto: "Pago anulado — créditos revertidos",
          detalle: `Correo: ${revertido.correo}\nItem: ${revertido.item}\nCréditos revertidos: ${revertido.creditos}\nReferencia: ${revertido.referencia}${revertido.tipo === "plan" ? "\n\nEra un plan — se canceló la suscripción." : ""}`,
        });
      }
    }
    return NextResponse.json({ ok: true });
  }

  // La respuesta síncrona del cobro puede aprobar este mismo pago un
  // instante antes que este webhook — claimPagoAprobado decide quién de
  // los dos queda a cargo de acreditar y activar la suscripción. Si
  // perdemos la carrera, el otro camino ya se encargó de todo esto.
  const credited = await claimPagoAprobado(pago.referencia, tx.id);
  if (!credited) return NextResponse.json({ ok: true });

  await addCreditsByEmail(pago.correo, pago.creditos, pago.tipo === "plan");
  await facturarCompra({
    correo: pago.correo,
    sku: item.id,
    concepto:
      pago.tipo === "plan"
        ? `Suscripción UNIQUE — Plan ${item.name ?? item.label}`
        : `Créditos adicionales UNIQUE — ${item.label}`,
    totalConIva: item.price,
    pagoId: pago.id,
  });
  if (pago.tipo === "plan") {
    // El pago quedó "Pendiente" del lado de Wompi y se aprobó tarde (por
    // eso llegamos por webhook y no por la respuesta síncrona del cobro):
    // hay que activar o renovar la suscripción acá porque el llamador
    // original ya recibió `pending: true` y nunca llamó upsertSubscription.
    const existing = await getSubscriptionByEmail(pago.correo);
    if (existing && existing.estado === "Activa") {
      await markSubscriptionRenewed(existing);
    } else {
      await upsertSubscription({
        correo: pago.correo,
        plan: pago.item,
        paymentSourceId: pago.paymentSourceId ?? existing?.paymentSourceId ?? 0,
      });
    }
  }
  // App Tracking Transparency (iOS): si la persona denegó el permiso en la
  // app, no le mandamos su correo a Meta — igual mandamos el valor de la
  // compra sin identificar a quién pertenece.
  const persona = await getUserCreditsByEmail(pago.correo);
  await sendMetaPurchaseEvent({
    eventId: tx.id,
    value: item.price,
    email: persona?.trackingConsent === false ? undefined : pago.correo,
  });

  return NextResponse.json({ ok: true });
}
