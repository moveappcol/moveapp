import { getAirtableBase } from "./airtable";

/**
 * Esquema en Airtable — tabla "Liquidacion" (una fila por clase, generada
 * automáticamente cuando se cumplen las 24h antes de la clase — a partir de
 * ahí las reservas ya no se pueden cancelar gratis, así que la lista queda
 * fija salvo por reservas nuevas hasta el corte de 20 min):
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
 *   - "Reservas Tipo A"           (número — cupos que el gimnasio dio a tiempo)
 *   - "Reservas Tipo B "           (número — cupos dados el mismo día o tarde;
 *      el nombre real del campo trae un espacio al final)
 *   - "Total Tipo A"                (número — Reservas Tipo A × Precio × 40%)
 *   - "Total tipo B "                 (número — Reservas Tipo B × Precio × 30%;
 *      el nombre real del campo trae "tipo" en minúscula y espacio al final)
 *   - "Total a pagar "                 (número, de solo lectura para el usuario
 *      pero escribible por la API — Total Tipo A + Total tipo B)
 *   - Reservas finales enviadas          (checkbox — evita reenviar el doc de
 *      "reservas finales" cuando el cron de 15 min corre varias veces)
 */
const LIQUIDACION_TABLE = "Liquidacion";
const ESTADO_PAGO_FIELD = "Estado de pago ";
const TOTAL_A_PAGAR_FIELD = "Total a pagar ";
const RESERVAS_TIPO_A_FIELD = "Reservas Tipo A";
const RESERVAS_TIPO_B_FIELD = "Reservas Tipo B ";
const TOTAL_TIPO_A_FIELD = "Total Tipo A";
const TOTAL_TIPO_B_FIELD = "Total tipo B ";

const PORCENTAJE_TIPO_A = 0.4;
const PORCENTAJE_TIPO_B = 0.3;

export type LiquidacionRecord = {
  id: string;
  reservasFinalesEnviadas: boolean;
};

/** Se trae todo y se filtra en JS — comparar fechas dentro de una fórmula
 * de Airtable no es confiable (ver ARRAYJOIN/filtro por fecha en otros
 * lugares del código), así que es más seguro comparar los valores ya
 * traídos. */
export async function findLiquidacion(
  gimnasio: string,
  clase: string,
  fecha: string
): Promise<LiquidacionRecord | null> {
  const base = getAirtableBase();
  const records = await base(LIQUIDACION_TABLE).select().all();
  const match = records.find(
    (r) =>
      (r.get("Gimnasio") as string) === gimnasio &&
      (r.get("Clase") as string) === clase &&
      (r.get("Fecha") as string) === fecha
  );
  if (!match) return null;
  return {
    id: match.id,
    reservasFinalesEnviadas: Boolean(match.get("Reservas finales enviadas")),
  };
}

export async function liquidacionExists(gimnasio: string, clase: string, fecha: string): Promise<boolean> {
  return (await findLiquidacion(gimnasio, clase, fecha)) !== null;
}

export async function markReservasFinalesEnviadas(id: string): Promise<void> {
  const base = getAirtableBase();
  await base(LIQUIDACION_TABLE).update(
    [{ id, fields: { "Reservas finales enviadas": true } }],
    { typecast: true }
  );
}

export type LiquidacionCounts = {
  reservasConfirmadas: number;
  creditosTotales: number;
  reservasTipoA: number;
  reservasTipoB: number;
  precioPorReserva: number | null;
  detalle: string;
};

export type LiquidacionTotals = {
  totalTipoA: number;
  totalTipoB: number;
  totalAPagar: number;
};

function computeTotals(counts: LiquidacionCounts): LiquidacionTotals {
  const precio = counts.precioPorReserva ?? 0;
  const totalTipoA = Math.round(counts.reservasTipoA * precio * PORCENTAJE_TIPO_A);
  const totalTipoB = Math.round(counts.reservasTipoB * precio * PORCENTAJE_TIPO_B);
  return { totalTipoA, totalTipoB, totalAPagar: totalTipoA + totalTipoB };
}

function countsToFields(counts: LiquidacionCounts, totals: LiquidacionTotals) {
  return {
    "Reservas confirmadas": counts.reservasConfirmadas,
    "Creditos totales": counts.creditosTotales,
    "Precio por reserva": counts.precioPorReserva !== null ? String(counts.precioPorReserva) : "",
    Detalle: counts.detalle,
    [RESERVAS_TIPO_A_FIELD]: counts.reservasTipoA,
    [RESERVAS_TIPO_B_FIELD]: counts.reservasTipoB,
    [TOTAL_TIPO_A_FIELD]: totals.totalTipoA,
    [TOTAL_TIPO_B_FIELD]: totals.totalTipoB,
    [TOTAL_A_PAGAR_FIELD]: totals.totalAPagar,
  };
}

export async function createLiquidacion(params: {
  gimnasio: string;
  clase: string;
  fecha: string;
  fechaDePago: string;
  counts: LiquidacionCounts;
}): Promise<{ id: string; totals: LiquidacionTotals }> {
  const base = getAirtableBase();
  const totals = computeTotals(params.counts);
  const created = await base(LIQUIDACION_TABLE).create(
    [
      {
        fields: {
          Gimnasio: params.gimnasio,
          Clase: params.clase,
          Fecha: params.fecha,
          [ESTADO_PAGO_FIELD]: "Pendiente",
          "Fecha de pago": params.fechaDePago,
          ...countsToFields(params.counts, totals),
        },
      },
    ],
    { typecast: true }
  );
  return { id: created[0].id, totals };
}

/** Actualiza los conteos/totales de una liquidación ya creada, sin tocar
 * Estado de pago ni Fecha de pago — se usa cuando el cron de "reservas
 * finales" encuentra reservas nuevas hechas después del corte de 24h. */
export async function updateLiquidacionCounts(
  id: string,
  counts: LiquidacionCounts
): Promise<LiquidacionTotals> {
  const base = getAirtableBase();
  const totals = computeTotals(counts);
  await base(LIQUIDACION_TABLE).update(
    [{ id, fields: countsToFields(counts, totals) }],
    { typecast: true }
  );
  return totals;
}

type ReservaComoRecord = { estado: string; tipo: "A" | "B" | null; userName: string };

/** Arma los conteos de una liquidación a partir de las reservas reales de
 * una clase. Solo cuentan como "confirmadas" (billables) las que no se
 * cancelaron a tiempo; el tipo A/B solo se cuenta entre esas — una reserva
 * sin Tipo asignado todavía no suma a ningún total hasta que el staff la
 * clasifique en Airtable. */
export function buildCountsFromReservas(
  reservas: ReservaComoRecord[],
  claseCredits: number,
  precioPorReserva: number | null
): LiquidacionCounts {
  const confirmadas = reservas.filter((r) => r.estado !== "Cancelado on time");
  const reservasTipoA = confirmadas.filter((r) => r.tipo === "A").length;
  const reservasTipoB = confirmadas.filter((r) => r.tipo === "B").length;
  const detalle = reservas.map((r) => `${r.userName} - ${r.estado}`).join("\n") || "Sin reservas.";
  return {
    reservasConfirmadas: confirmadas.length,
    creditosTotales: confirmadas.length * claseCredits,
    reservasTipoA,
    reservasTipoB,
    precioPorReserva,
    detalle,
  };
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
