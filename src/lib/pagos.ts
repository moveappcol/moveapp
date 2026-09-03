import { getAirtableBase, escapeFormulaValue } from "./airtable";
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
