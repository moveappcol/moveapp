import * as XLSX from "xlsx";
import { getAirtableBase } from "./airtable";

/** Todas las tablas conocidas de la base — si se agrega una tabla nueva al
 * proyecto, hay que sumarla aquí para que el backup diario la incluya. */
const TABLES = [
  "Gimnasios",
  "Clases",
  "Reservas",
  "usuarios",
  "Suscripciones",
  "Liquidacion",
  "Pagos",
  "Cupones",
] as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function recordToRow(record: any): Record<string, unknown> {
  const row: Record<string, unknown> = {
    "Record ID": record.id,
    "Creado": record._rawJson?.createdTime ?? "",
  };
  for (const [key, value] of Object.entries(record.fields as Record<string, unknown>)) {
    row[key] = Array.isArray(value) ? value.join(", ") : value;
  }
  return row;
}

/** Descarga todas las tablas de Airtable y arma un Excel con una hoja por
 * tabla — para el backup diario de seguridad. */
export async function buildBackupWorkbook(): Promise<Buffer> {
  const base = getAirtableBase();
  const workbook = XLSX.utils.book_new();

  for (const table of TABLES) {
    let rows: Record<string, unknown>[] = [];
    try {
      const records = await base(table).select().all();
      rows = records.map(recordToRow);
    } catch {
      rows = [{ Error: `No se pudo leer la tabla "${table}"` }];
    }

    const sheet =
      rows.length > 0
        ? XLSX.utils.json_to_sheet(rows)
        : XLSX.utils.aoa_to_sheet([["(sin registros)"]]);

    // Los nombres de hoja de Excel no pueden pasar de 31 caracteres.
    XLSX.utils.book_append_sheet(workbook, sheet, table.slice(0, 31));
  }

  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
