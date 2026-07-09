import { getAirtableBase } from "./airtable";

/**
 * Esquema en Airtable — tabla "Liquidacion" (una fila por clase, generada
 * automáticamente cuando se cumplen las 24h antes de la clase — a partir de
 * ahí las reservas ya no se pueden cancelar gratis, así que la lista queda
 * fija):
 *   - Gimnasio           (texto — nombre del gimnasio)
 *   - Clase               (texto — nombre de la clase)
 *   - Fecha                (fecha de la clase)
 *   - Reservas confirmadas (número — reservas que no se cancelaron a tiempo)
 *   - Creditos totales      (número)
 *   - Precio por reserva     (texto — copiado del gimnasio, ej. "30000")
 *   - Detalle                 (texto largo — nombre y estado de cada reserva)
 *   - "Estado de pago "        (selección: "Pendiente" | "Pagado" — el
 *      nombre real del campo tiene un espacio al final)
 *   - Fecha de pago              (fecha, calculada con la regla de quincena)
 *   - "Total a pagar "             (fórmula de Airtable, de solo lectura —
 *      Reservas confirmadas × Precio por reserva)
 */
const LIQUIDACION_TABLE = "Liquidacion";
const ESTADO_PAGO_FIELD = "Estado de pago ";
const TOTAL_A_PAGAR_FIELD = "Total a pagar ";

/** Se trae todo y se filtra en JS — comparar fechas dentro de una fórmula
 * de Airtable no es confiable (ver ARRAYJOIN/filtro por fecha en otros
 * lugares del código), así que es más seguro comparar los valores ya
 * traídos. */
export async function liquidacionExists(gimnasio: string, clase: string, fecha: string): Promise<boolean> {
  const base = getAirtableBase();
  const records = await base(LIQUIDACION_TABLE).select().all();
  return records.some(
    (r) =>
      (r.get("Gimnasio") as string) === gimnasio &&
      (r.get("Clase") as string) === clase &&
      (r.get("Fecha") as string) === fecha
  );
}

export async function createLiquidacion(params: {
  gimnasio: string;
  clase: string;
  fecha: string;
  reservasConfirmadas: number;
  creditosTotales: number;
  precioPorReserva: number | null;
  detalle: string;
  fechaDePago: string;
}): Promise<{ id: string; totalAPagar: number }> {
  const base = getAirtableBase();
  const created = await base(LIQUIDACION_TABLE).create(
    [
      {
        fields: {
          Gimnasio: params.gimnasio,
          Clase: params.clase,
          Fecha: params.fecha,
          "Reservas confirmadas": params.reservasConfirmadas,
          "Creditos totales": params.creditosTotales,
          "Precio por reserva": params.precioPorReserva !== null ? String(params.precioPorReserva) : "",
          Detalle: params.detalle,
          [ESTADO_PAGO_FIELD]: "Pendiente",
          "Fecha de pago": params.fechaDePago,
        },
      },
    ],
    { typecast: true }
  );
  const totalAPagar = (created[0].fields[TOTAL_A_PAGAR_FIELD] as number) ?? 0;
  return { id: created[0].id, totalAPagar };
}

function bogotaDateParts(iso: string): { year: number; month: number; day: number } {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = fmt.formatToParts(new Date(iso));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { year: get("year"), month: get("month"), day: get("day") };
}

/** "Y-M-D" del día de la clase en hora de Bogotá (no la del proceso del
 * servidor, que en producción puede no ser America/Bogota). */
export function toBogotaDateString(iso: string): string {
  const { year, month, day } = bogotaDateParts(iso);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Fecha de pago quincenal: clases del 1–15 se pagan el 16 del mismo mes;
 * del 16 a fin de mes se pagan el 1 del mes siguiente. */
export function computeFechaDePago(claseISO: string): string {
  const { year, month, day } = bogotaDateParts(claseISO);
  if (day <= 15) {
    return `${year}-${String(month).padStart(2, "0")}-16`;
  }
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  return `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;
}
