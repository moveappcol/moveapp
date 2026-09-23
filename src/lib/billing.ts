import { chargeWithPaymentSource } from "./wompi";
import { findCatalogItem, buildReference } from "./orders";
import {
  createPendingPago,
  updatePagoEstado,
  updatePagoFactura,
  claimPagoAprobado,
  reserveNextFacturaNumero,
  reserveNextNotaCreditoNumero,
  type Pago,
} from "./pagos";
import { addCreditsByEmail, getUserCreditsByEmail } from "./users";
import { createElectronicInvoice, createCreditNote, extractInvoiceUuidFromPdfUrl } from "./dataico";
import { isTipoDocumento } from "./documento";
import { sendOpsAlertEmail } from "./email";

const OWNER_EMAIL = "uniqueappcol@gmail.com";

/** Genera la factura electrónica por una compra ya cobrada y acreditada.
 * Nunca deja que un fallo acá se propague — el pago y el abono de
 * créditos ya pasaron; si Dataico falla, se avisa por correo para
 * facturar manual en vez de romper la respuesta al comprador. */
export async function facturarCompra(params: {
  correo: string;
  /** Id del catálogo (ej. "topup-5", "plan-starter") — Dataico lo exige
   * como "sku" de cada ítem de la factura. */
  sku: string;
  concepto: string;
  totalConIva: number;
  /** Record de "Pagos" a actualizar con el link al PDF y el CUFE cuando la
   * factura se genera bien, y donde se reserva el número de factura —
   * siempre debería venir; si no, no hay dónde reservar el número y no se
   * puede facturar. */
  pagoId?: string;
}): Promise<void> {
  try {
    if (!params.pagoId) {
      await sendOpsAlertEmail({
        ownerEmail: OWNER_EMAIL,
        asunto: "No se pudo generar la factura electrónica",
        detalle: `Compra: ${params.concepto}\nCorreo: ${params.correo}\nValor: ${params.totalConIva}\n\nFalta el pagoId — no hay dónde reservar el número de factura.\n\nHay que facturar esta compra manual mientras se revisa.`,
      });
      return;
    }
    const pagoId = params.pagoId;
    const numero = await reserveNextFacturaNumero(pagoId);
    const account = await getUserCreditsByEmail(params.correo);
    const result = await createElectronicInvoice({
      numero,
      sku: params.sku,
      concepto: params.concepto,
      totalConIva: params.totalConIva,
      correo: params.correo,
      nombre: account?.nombre ?? "",
      apellido: account?.apellido ?? "",
      tipoDocumento:
        account?.tipoDocumento && isTipoDocumento(account.tipoDocumento) ? account.tipoDocumento : null,
      cedula: account?.cedula ?? "",
      telefono: account?.telefono ?? null,
    });
    if (result.ok) {
      await updatePagoFactura(pagoId, { pdfUrl: result.pdfUrl, cufe: result.cufe });
    } else {
      await sendOpsAlertEmail({
        ownerEmail: OWNER_EMAIL,
        asunto: "No se pudo generar la factura electrónica",
        detalle: `Compra: ${params.concepto}\nCorreo: ${params.correo}\nValor: ${params.totalConIva}\n\nError de Dataico: ${result.error}\n\nHay que facturar esta compra manual mientras se revisa.`,
      });
    }
  } catch (err) {
    await sendOpsAlertEmail({
      ownerEmail: OWNER_EMAIL,
      asunto: "No se pudo generar la factura electrónica",
      detalle: `Compra: ${params.concepto}\nCorreo: ${params.correo}\nValor: ${params.totalConIva}\n\nExcepción: ${err instanceof Error ? err.message : String(err)}\n\nHay que facturar esta compra manual mientras se revisa.`,
    }).catch(() => {});
  }
}

/** Anula ante la DIAN la factura de un pago que ya se había facturado y
 * luego se revirtió (ej. anulación manual desde el dashboard de Wompi) —
 * anular el pago ahí NO anula la factura electrónica, hace falta emitir una
 * nota crédito aparte. No hace nada si el pago nunca llegó a tener factura
 * (compra que nunca se facturó, o falló), ni si ya tiene una nota crédito
 * emitida (idempotencia — evita duplicarla si el webhook de Wompi llega más
 * de una vez). Nunca deja que un fallo acá se propague — si Dataico falla,
 * se avisa por correo para anularla manual. */
export async function anularFacturaPorReversion(pago: Pago): Promise<void> {
  if (!pago.facturaPdfUrl || pago.notaCredito) return;
  try {
    const invoiceUuid = extractInvoiceUuidFromPdfUrl(pago.facturaPdfUrl);
    if (!invoiceUuid) {
      await sendOpsAlertEmail({
        ownerEmail: OWNER_EMAIL,
        asunto: "No se pudo anular la factura electrónica",
        detalle: `Correo: ${pago.correo}\nItem: ${pago.item}\nReferencia: ${pago.referencia}\n\nEl pago tenía factura generada pero no se pudo leer el UUID de su link (${pago.facturaPdfUrl}).\n\nHay que anularla manual con una nota crédito en Dataico.`,
      });
      return;
    }
    const numero = await reserveNextNotaCreditoNumero(pago.id);
    const result = await createCreditNote({ invoiceUuid, numero });
    if (!result.ok) {
      await sendOpsAlertEmail({
        ownerEmail: OWNER_EMAIL,
        asunto: "No se pudo anular la factura electrónica",
        detalle: `Correo: ${pago.correo}\nItem: ${pago.item}\nReferencia: ${pago.referencia}\nFactura: ${pago.facturaPdfUrl}\n\nError de Dataico al emitir la nota crédito: ${result.error}\n\nHay que anularla manual mientras se resuelve.`,
      });
      return;
    }
    await sendOpsAlertEmail({
      ownerEmail: OWNER_EMAIL,
      asunto: "Factura electrónica anulada (nota crédito emitida)",
      detalle: `Correo: ${pago.correo}\nItem: ${pago.item}\nReferencia: ${pago.referencia}\n\nSe emitió la nota crédito que anula la factura ante la DIAN.\nCUFE nota crédito: ${result.cufe}\nPDF: ${result.pdfUrl}`,
    });
  } catch (err) {
    await sendOpsAlertEmail({
      ownerEmail: OWNER_EMAIL,
      asunto: "No se pudo anular la factura electrónica",
      detalle: `Correo: ${pago.correo}\nItem: ${pago.item}\nReferencia: ${pago.referencia}\nFactura: ${pago.facturaPdfUrl}\n\nExcepción: ${err instanceof Error ? err.message : String(err)}\n\nHay que anularla manual mientras se revisa.`,
    }).catch(() => {});
  }
}

export type ChargeResult =
  | {
      ok: true;
      transactionId: string;
      credits: number;
      /** false si el webhook de Wompi ya había aprobado y acreditado este
       * mismo pago un instante antes que esta respuesta síncrona — el
       * llamador NO debe activar/renovar la suscripción de nuevo en ese
       * caso, el webhook ya lo hizo. */
      credited: boolean;
    }
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
  /** Fecha (YYYY-MM-DD) desde la que empieza a correr el plan — solo para
   * promos de prepago (ver Cupon.inicioDiferido). Si no se pasa, el plan
   * empieza a correr desde hoy, como siempre. */
  fechaInicio?: string;
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

  if (tx.status !== "APPROVED") {
    await updatePagoEstado(pagoId, "Rechazado", tx.id);
    return { ok: false, error: `Pago ${tx.status.toLowerCase()}.` };
  }

  // El webhook de Wompi puede llegar y aprobar este mismo pago un instante
  // antes que este punto — claimPagoAprobado decide quién de los dos queda
  // a cargo de acreditar, para no hacerlo dos veces.
  const credited = await claimPagoAprobado(reference, tx.id);
  if (credited) {
    await addCreditsByEmail(params.correo, item.credits, true, params.fechaInicio);
    await facturarCompra({
      correo: params.correo,
      sku: item.id,
      concepto: `Suscripción UNIQUE — Plan ${item.name ?? item.label}`,
      totalConIva: precio,
      pagoId,
    });
  }
  return { ok: true, transactionId: tx.id, credits: item.credits, credited };
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

  if (tx.status !== "APPROVED") {
    await updatePagoEstado(pagoId, "Rechazado", tx.id);
    return { ok: false, error: `Pago ${tx.status.toLowerCase()}.` };
  }

  const credited = await claimPagoAprobado(reference, tx.id);
  if (credited) {
    await addCreditsByEmail(params.correo, item.credits, false);
    await facturarCompra({
      correo: params.correo,
      sku: item.id,
      concepto: `Créditos adicionales UNIQUE — ${item.label}`,
      totalConIva: item.price,
      pagoId,
    });
  }
  return { ok: true, transactionId: tx.id, credits: item.credits, credited };
}
