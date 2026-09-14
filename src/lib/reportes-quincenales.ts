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
