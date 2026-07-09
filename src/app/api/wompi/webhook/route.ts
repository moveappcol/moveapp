import { NextRequest, NextResponse } from "next/server";
import { verifyEventChecksum } from "@/lib/wompi";
import { findCatalogItem, parseReference } from "@/lib/orders";
import { findPagoByReferencia, updatePagoEstado, type PagoEstado } from "@/lib/pagos";
import { addCreditsByEmail } from "@/lib/users";

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

  // Idempotencia: si Wompi reintenta el webhook, no acreditamos dos veces.
  if (pago.estado === "Aprobado") {
    return NextResponse.json({ ok: true });
  }

  const nextEstado = statusToEstado(tx.status);
  await updatePagoEstado(pago.id, nextEstado, tx.id);

  if (nextEstado === "Aprobado") {
    await addCreditsByEmail(pago.correo, pago.creditos, pago.tipo === "plan");
  }

  return NextResponse.json({ ok: true });
}
