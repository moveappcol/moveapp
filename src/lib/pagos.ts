import { getAirtableBase } from "./airtable";
import type { PurchaseKind } from "./orders";

/**
 * Esquema en Airtable — tabla "Pagos" (auditoría + idempotencia de pagos Wompi):
 *   - Referencia    (texto, única por intento de compra)
 *   - TransaccionId (texto, id de la transacción en Wompi)
 *   - Correo        (texto)
 *   - Tipo          (selección: "Plan" | "Adicional")
 *   - item          (texto, minúscula — id del catálogo, ej. "plan-25")
 *   - Creditos      (número)
 *   - Estado        (selección: "Pendiente" | "Aprobado" | "Rechazado")
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
};

function mapRecordToPago(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  record: any
): Pago {
  return {
    id: record.id,
    referencia: (record.get("Referencia") as string) ?? "",
    correo: (record.get("Correo") as string) ?? "",
    tipo: (record.get("Tipo") as string) === "Plan" ? "plan" : "topup",
    item: (record.get("item") as string) ?? "",
    creditos: (record.get("Creditos") as number) ?? 0,
    estado: ((record.get("Estado") as string) ?? "Pendiente") as PagoEstado,
  };
}

export async function createPendingPago(params: {
  referencia: string;
  correo: string;
  tipo: PurchaseKind;
  item: string;
  creditos: number;
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
      filterByFormula: `{Referencia} = "${referencia}"`,
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
