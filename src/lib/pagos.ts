import { getAirtableBase, escapeFormulaValue } from "./airtable";
import { withLock } from "./server-cache";
import type { PurchaseKind } from "./orders";

/**
 * Esquema en Airtable — tabla "Pagos" (auditoría + idempotencia de pagos Wompi):
 *   - Referencia    (texto, única por intento de compra)
 *   - TransaccionId (texto, id de la transacción en Wompi)
 *   - Correo        (texto)
 *   - Tipo          (selección: "Plan" | "Adicional")
 *   - item          (texto, minúscula — id del catálogo, ej. "plan-starter")
 *   - Creditos      (número)
 *   - Estado        (selección: "Pendiente" | "Aprobado" | "Rechazado")
 *   - PaymentSourceId (número, opcional — solo para "Plan": la fuente de
 *      pago de Wompi que se cobró, para poder activar/renovar la
 *      suscripción desde el webhook si Wompi confirma la aprobación tarde)
 *   - "Factura PDF"  (texto, opcional — link al PDF de la factura
 *      electrónica generada en Dataico; vacío si todavía no se ha generado
 *      o si falló, ver la alerta por correo en ese caso)
 *   - "Factura CUFE" (texto, opcional — código único de la factura ante la
 *      DIAN, para referencia/soporte)
 *   - "Factura Numero" (número entero, opcional — el consecutivo dentro del
 *      rango autorizado por la resolución DIAN de UNIQUE, ej. 1-5000;
 *      Dataico lo exige explícito, no lo asigna solo. Se reserva ANTES de
 *      llamar a Dataico, así que puede quedar puesto en un pago cuya
 *      factura terminó fallando — eso deja un hueco en la numeración, que
 *      es normal y está permitido en facturación electrónica.)
 *   - "NotaCredito" (número entero, opcional — el consecutivo dentro de la
 *      numeración de notas crédito, prefijo "NCE" (a diferencia de las
 *      facturas, esta numeración no usa resolución DIAN, ver
 *      CREDIT_NOTE_PREFIX en dataico.ts). Se pone cuando un pago con
 *      factura ya generada se anula después y hay que anular esa factura
 *      ante la DIAN — también sirve como marca de "esta reversión ya
 *      emitió su nota crédito", para no duplicarla.)
 */
const PAGOS_TABLE = "Pagos";

export type PagoEstado = "Pendiente" | "Aprobado" | "Rechazado";

export type Pago = {
  id: string;
  referencia: string;
  correo: string;
  tipo: PurchaseKind;
  item: string;
  creditos: number;
  estado: PagoEstado;
  paymentSourceId: number | null;
  /** Link al PDF de la factura electrónica ya generada, si la hay — trae el
   * UUID de la factura en Dataico (query param "document-id"), necesario
   * para poder anularla con una nota crédito si el pago se revierte
   * después. Null si nunca se facturó (o falló). */
  facturaPdfUrl: string | null;
  /** Número de la nota crédito ya emitida para este pago, si la hay — sirve
   * de marca de idempotencia: si ya tiene una, no hay que emitir otra. */
  notaCredito: number | null;
};

function mapRecordToPago(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  record: any
): Pago {
  const paymentSourceId = record.get("PaymentSourceId") as number | undefined;
  return {
    id: record.id,
    referencia: (record.get("Referencia") as string) ?? "",
    correo: (record.get("Correo") as string) ?? "",
    tipo: (record.get("Tipo") as string) === "Plan" ? "plan" : "topup",
    item: (record.get("item") as string) ?? "",
    creditos: (record.get("Creditos") as number) ?? 0,
    estado: ((record.get("Estado") as string) ?? "Pendiente") as PagoEstado,
    paymentSourceId: paymentSourceId !== undefined && paymentSourceId !== null ? paymentSourceId : null,
    facturaPdfUrl: (record.get("Factura PDF") as string) || null,
    notaCredito: (record.get("NotaCredito") as number) || null,
  };
}

export async function createPendingPago(params: {
  referencia: string;
  correo: string;
  tipo: PurchaseKind;
  item: string;
  creditos: number;
  paymentSourceId?: number;
}): Promise<string> {
  const base = getAirtableBase();
  const created = await base(PAGOS_TABLE).create(
    [
      {
        fields: {
          Referencia: params.referencia,
          Correo: params.correo,
          Tipo: params.tipo === "plan" ? "Plan" : "Adicional",
          item: params.item,
          Creditos: params.creditos,
          Estado: "Pendiente",
          ...(params.paymentSourceId !== undefined ? { PaymentSourceId: params.paymentSourceId } : {}),
        },
      },
    ],
    { typecast: true }
  );
  return created[0].id;
}

export async function findPagoByReferencia(referencia: string): Promise<Pago | null> {
  const base = getAirtableBase();
  const records = await base(PAGOS_TABLE)
    .select({
      filterByFormula: `{Referencia} = "${escapeFormulaValue(referencia)}"`,
      maxRecords: 1,
    })
    .all();
  const record = records[0];
  return record ? mapRecordToPago(record) : null;
}

/** El cobro síncrono (justo al pagar) y el webhook de Wompi pueden confirmar
 * la MISMA transacción casi al mismo tiempo — cada uno leería el pago
 * todavía en "Pendiente" y los dos acreditarían créditos y activarían la
 * suscripción por separado. Esto serializa: solo quien gana el lock con un
 * pago que de verdad seguía sin aprobar queda a cargo de acreditar y
 * activar/renovar — el otro debe no hacer nada (ver el `credited` que
 * devuelve, o el llamador de este archivo). */
export async function claimPagoAprobado(referencia: string, transaccionId: string): Promise<boolean> {
  return withLock(`pago:${referencia}`, async () => {
    const fresh = await findPagoByReferencia(referencia);
    if (!fresh || fresh.estado === "Aprobado") return false;
    await updatePagoEstado(fresh.id, "Aprobado", transaccionId);
    return true;
  });
}

/** Un pago que ya estaba "Aprobado" (créditos ya dados) llega anulado desde
 * Wompi (ej. reembolso manual desde su dashboard) — como con
 * claimPagoAprobado, se usa el mismo lock para que dos webhooks del mismo
 * evento no reviertan los créditos dos veces. Devuelve el pago (con sus
 * datos de antes de marcarlo "Rechazado") para que el llamador sepa cuántos
 * créditos quitar; null si no había nada que revertir. */
export async function claimPagoRevertido(referencia: string, transaccionId: string): Promise<Pago | null> {
  return withLock(`pago:${referencia}`, async () => {
    const fresh = await findPagoByReferencia(referencia);
    if (!fresh || fresh.estado !== "Aprobado") return null;
    await updatePagoEstado(fresh.id, "Rechazado", transaccionId);
    return fresh;
  });
}

export async function updatePagoEstado(
  recordId: string,
  estado: PagoEstado,
  transaccionId: string
): Promise<void> {
  const base = getAirtableBase();
  await base(PAGOS_TABLE).update(
    [{ id: recordId, fields: { Estado: estado, TransaccionId: transaccionId } }],
    { typecast: true }
  );
}

/** Guarda la referencia de la factura electrónica ya generada en Dataico,
 * para tener el link al PDF y el CUFE a la mano desde el mismo registro
 * del pago — sin esto, un pago exitoso no deja ningún rastro de si la
 * factura se generó bien o no (solo se avisaba por correo cuando fallaba). */
export async function updatePagoFactura(
  recordId: string,
  factura: { pdfUrl: string; cufe: string }
): Promise<void> {
  const base = getAirtableBase();
  await base(PAGOS_TABLE).update(
    [{ id: recordId, fields: { "Factura PDF": factura.pdfUrl, "Factura CUFE": factura.cufe } }],
    { typecast: true }
  );
}

/** Reserva el siguiente número de factura dentro del rango de la resolución
 * DIAN, bajo un lock global para que dos compras al mismo tiempo nunca
 * terminen usando el mismo número. Se guarda en el propio Pago antes de
 * llamar a Dataico — si la factura falla después, el número queda "gastado"
 * (hueco en la numeración), lo cual es válido, en vez de arriesgarse a
 * reutilizarlo. */
export async function reserveNextFacturaNumero(recordId: string): Promise<number> {
  return withLock("dataico:numeracion", async () => {
    const base = getAirtableBase();
    const usados = await base(PAGOS_TABLE)
      .select({ filterByFormula: `{Factura Numero} != ""`, fields: ["Factura Numero"] })
      .all();
    const max = usados.reduce((m, r) => Math.max(m, Number(r.get("Factura Numero")) || 0), 0);
    const numero = max + 1;
    await base(PAGOS_TABLE).update([{ id: recordId, fields: { "Factura Numero": numero } }], {
      typecast: true,
    });
    return numero;
  });
}

/** Igual que reserveNextFacturaNumero, pero para la resolución DIAN de
 * notas crédito (rango y prefijo aparte de la de facturas) — lock y campo
 * separados para que las dos numeraciones nunca se mezclen. */
export async function reserveNextNotaCreditoNumero(recordId: string): Promise<number> {
  return withLock("dataico:numeracion-nc", async () => {
    const base = getAirtableBase();
    const usados = await base(PAGOS_TABLE)
      .select({ filterByFormula: `{NotaCredito} != ""`, fields: ["NotaCredito"] })
      .all();
    const max = usados.reduce((m, r) => Math.max(m, Number(r.get("NotaCredito")) || 0), 0);
    const numero = max + 1;
    await base(PAGOS_TABLE).update([{ id: recordId, fields: { NotaCredito: numero } }], {
      typecast: true,
    });
    return numero;
  });
}
