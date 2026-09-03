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
  /** Fracción entre 0 y 1 (0.2 = 20% de descuento) — ya validada por el
   * llamador contra un cupón real, nunca confiar en un valor del cliente. */
  descuento?: number;
}): Promise<ChargeResult> {
  const item = findCatalogItem("plan", params.planId);
  if (!item) return { ok: false, error: "Plan desconocido." };

  const precio = params.descuento ? Math.round(item.price * (1 - params.descuento)) : item.price;

  const reference = buildReference("plan", params.planId, params.ownerRef);
  const pagoId = await createPendingPago({
    referencia: reference,
    correo: params.correo,
    tipo: "plan",
    item: params.planId,
    creditos: item.credits,
    paymentSourceId: params.paymentSourceId,
  });

  let tx;
  try {
    tx = await chargeWithPaymentSource({
      amountInCents: precio * 100,
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

/** Cobra un paquete de créditos adicionales contra una fuente de pago
 * guardada. El llamador debe validar antes que la persona tenga un plan
 * activo — los adicionales no son una suscripción en sí mismos. */
export async function chargeTopup(params: {
  correo: string;
  topupId: string;
  paymentSourceId: number;
  ownerRef: string;
}): Promise<ChargeResult> {
  const item = findCatalogItem("topup", params.topupId);
  if (!item) return { ok: false, error: "Paquete de créditos desconocido." };

  const reference = buildReference("topup", params.topupId, params.ownerRef);
  const pagoId = await createPendingPago({
    referencia: reference,
    correo: params.correo,
    tipo: "topup",
    item: params.topupId,
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
    await updatePagoEstado(pagoId, "Pendiente", tx.id);
    return { ok: false, pending: true, error: "Tu pago está siendo procesado. Te avisaremos apenas se confirme." };
  }

  const estado = tx.status === "APPROVED" ? "Aprobado" : "Rechazado";
  await updatePagoEstado(pagoId, estado, tx.id);

  if (estado !== "Aprobado") {
    return { ok: false, error: `Pago ${tx.status.toLowerCase()}.` };
  }

  await addCreditsByEmail(params.correo, item.credits, false);
  return { ok: true, transactionId: tx.id, credits: item.credits };
}
