import { getAirtableBase, escapeFormulaValue } from "./airtable";

/**
 * Esquema en Airtable — tabla "Reportes quincenales":
 *   - Periodo  (texto — clave única "YYYY-MM-DD_YYYY-MM-DD", desde y hasta)
 *   - Enviado  (casilla — true una vez que se intentó mandar el reporte a
 *      los gimnasios y a UNIQUE sin que el proceso se colgara; no significa
 *      que cada correo individual haya llegado, eso se ve en emailFailed)
 *
 * Existe para poder reintentar en días posteriores si el día exacto de
 * envío (14 o último día del mes) falla — antes no había forma de saber
 * "¿ya se mandó este periodo?", así que un solo fallo dejaba el reporte
 * perdido para siempre.
 */
const REPORTES_TABLE = "Reportes quincenales";

export async function reporteQuincenalYaEnviado(periodoKey: string): Promise<boolean> {
  const base = getAirtableBase();
  const records = await base(REPORTES_TABLE)
    .select({
      filterByFormula: `{Periodo} = "${escapeFormulaValue(periodoKey)}"`,
      maxRecords: 1,
    })
    .all();
  return records.some((r) => Boolean(r.get("Enviado")));
}

export async function marcarReporteQuincenalEnviado(periodoKey: string): Promise<void> {
  const base = getAirtableBase();
  await base(REPORTES_TABLE).create([{ fields: { Periodo: periodoKey, Enviado: true } }], {
    typecast: true,
  });
}

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Mes y último día del mes ANTERIOR al dado — hace falta porque el
 * periodo "28 al fin de mes" de un mes se paga el 13 del mes SIGUIENTE
 * (ver computeFechaDePago en liquidaciones.ts), así que el día 13 hay que
 * revisar un periodo que pertenece al mes que ya pasó. */
function previousMonthParts(year: number, month: number): { year: number; month: number; lastDay: number } {
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const prevLastDay = new Date(prevYear, prevMonth, 0).getDate();
  return { year: prevYear, month: prevMonth, lastDay: prevLastDay };
}

export type PeriodoReporte = { desde: string; hasta: string; periodo: string; key: string };

/** Qué periodos del reporte quincenal tocan "hoy" (día/mes/año de Bogotá).
 * Coinciden con los cortes de pago de Liquidacion (ver computeFechaDePago):
 *   - Corte del 13: clases del 28 del mes anterior al 13 de este mes. Es UN
 *     solo pago, así que va en UN solo reporte — antes se partía en "28 al
 *     fin de mes" y "1 al 13", y el 13 de noviembre de 2026 a cada gimnasio
 *     le llegaron dos correos para el mismo corte.
 *   - Corte del 27: clases del 14 al 27.
 * Cada periodo sigue "pendiente" desde su día de corte hasta que quede
 * marcado como enviado (ver reporteQuincenalYaEnviado), para reintentarse
 * solo si el día exacto falla. */
export function periodosDeReporte(year: number, month: number, day: number): PeriodoReporte[] {
  const periodos: PeriodoReporte[] = [];
  if (day >= 13) {
    const prev = previousMonthParts(year, month);
    const mismoAño = prev.year === year;
    periodos.push({
      desde: `${prev.year}-${pad(prev.month)}-28`,
      hasta: `${year}-${pad(month)}-13`,
      periodo: mismoAño
        ? `28 de ${MESES[prev.month - 1]} al 13 de ${MESES[month - 1]} de ${year}`
        : `28 de ${MESES[prev.month - 1]} de ${prev.year} al 13 de ${MESES[month - 1]} de ${year}`,
      key: `${prev.year}-${pad(prev.month)}-28_${year}-${pad(month)}-13`,
    });
  }
  if (day >= 27) {
    periodos.push({
      desde: `${year}-${pad(month)}-14`,
      hasta: `${year}-${pad(month)}-27`,
      periodo: `14 al 27 de ${MESES[month - 1]} de ${year}`,
      key: `${year}-${pad(month)}-14_${year}-${pad(month)}-27`,
    });
  }
  return periodos;
}
