import { chargeWithPaymentSource } from "./wompi";
import { findCatalogItem, buildReference } from "./orders";
import { createPendingPago, updatePagoEstado } from "./pagos";
import { addCreditsByEmail } from "./users";

export type ChargeResult =
  | { ok: true; transactionId: string; credits: number }
  | { ok: false; error: string; pending?: boolean };

/** Cobra un plan contra una fuente de pago guardada y, si Wompi aprueba,
 * acredita los créditos. Usado tanto por el primer cobro (al suscribirse)
 * como por la renovación mensual del cron — misma lógica, mismo registro
 * de auditoría en "Pagos". */
export async function chargeSubscriptionPlan(params: {
  correo: string;
  planId: string;
  paymentSourceId: number;
  ownerRef: string;
}): Promise<ChargeResult> {
  const item = findCatalogItem("plan", params.planId);
  if (!item) return { ok: false, error: "Plan desconocido." };

  const reference = buildReference("plan", params.planId, params.ownerRef);
  const pagoId = await createPendingPago({
    referencia: reference,
    correo: params.correo,
    tipo: "plan",
    item: params.planId,
    creditos: item.credits,
  });

  let tx;
  try {
    tx = await chargeWithPaymentSource({
      amountInCents: item.price * 100,
      customerEmail: params.correo,
      paymentSourceId: params.paymentSourceId,
      reference,
    });
  } catch (err) {
    await updatePagoEstado(pagoId, "Rechazado", "");
    return { ok: false, error: err instanceof Error ? err.message : "No pudimos cobrar la tarjeta." };
  }

  if (tx.status === "PENDING") {
    // Sigue en proceso del lado de Wompi. Dejamos el Pago en "Pendiente"
    // (con el TransaccionId real) y el webhook lo confirma más tarde.
    await updatePagoEstado(pagoId, "Pendiente", tx.id);
    return { ok: false, pending: true, error: "Tu pago está siendo procesado. Te avisaremos apenas se confirme." };
  }

  const estado = tx.status === "APPROVED" ? "Aprobado" : "Rechazado";
  await updatePagoEstado(pagoId, estado, tx.id);

  if (estado !== "Aprobado") {
    return { ok: false, error: `Pago ${tx.status.toLowerCase()}.` };
  }

  await addCreditsByEmail(params.correo, item.credits, true);
  return { ok: true, transactionId: tx.id, credits: item.credits };
}
