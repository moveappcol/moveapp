import { getAirtableBase } from "./airtable";

export type Clase = {
  id: string;
  name: string;
  credits: number;
  cuposTotales: number;
  cuposDisponibles: number;
  fecha: string | null;
  gimnasioId: string | null;
};

/**
 * Esquema en Airtable — tabla "Clases":
 *   - Clase          (texto, nombre de la clase)
 *   - Creditos       (número)
 *   - Cupos totales  (número)
 *   - Horario        (fecha y hora — cada fila es una sesión específica,
 *                      no un horario recurrente)
 *   - "Gimnasio "    (link a Gimnasios — OJO: el nombre real trae un espacio al final)
 *
 * "Numero", "Reservas" y "Reservas 2" existen pero no se usan aquí.
 *
 * Los cupos disponibles se calculan (no se guardan): Cupos totales menos el
 * número de Reservas activas (Estado = "Reservado") para esa clase.
 */
const GIMNASIO_FIELD = "Gimnasio ";

async function getActiveReservationCounts(): Promise<Map<string, number>> {
  const base = getAirtableBase();
  const records = await base("Reservas")
    .select({ filterByFormula: '{Estado} = "Reservado"' })
    .all();

  const counts = new Map<string, number>();
  for (const record of records) {
    const claseId = (record.get("Clase") as string[] | undefined)?.[0];
    if (!claseId) continue;
    counts.set(claseId, (counts.get(claseId) ?? 0) + 1);
  }
  return counts;
}

export async function countActiveReservationsForClase(claseId: string): Promise<number> {
  const base = getAirtableBase();
  const records = await base("Reservas")
    .select({ filterByFormula: '{Estado} = "Reservado"' })
    .all();
  return records.filter((r) => (r.get("Clase") as string[] | undefined)?.[0] === claseId)
    .length;
}

function mapRecordToClase(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  record: any,
  reservados: number
): Clase {
  const gimnasio = record.get(GIMNASIO_FIELD) as string[] | undefined;
  const cuposTotales = (record.get("Cupos totales") as number) ?? 0;
  return {
    id: record.id,
    name: (record.get("Clase") as string)?.trim() ?? "Sin nombre",
    credits: (record.get("Creditos") as number) ?? 0,
    cuposTotales,
    cuposDisponibles: Math.max(0, cuposTotales - reservados),
    fecha: (record.get("Horario") as string) ?? null,
    gimnasioId: gimnasio?.[0] ?? null,
  };
}

export async function getClassesForGym(gimnasioId: string): Promise<Clase[]> {
  const base = getAirtableBase();
  // Se filtra en JS en vez de con filterByFormula: ARRAYJOIN sobre un campo
  // de enlace concatena los nombres de los registros vinculados, no sus IDs,
  // así que no se puede buscar el gimnasioId directamente en una fórmula.
  const [records, activeCounts] = await Promise.all([
    base("Clases").select().all(),
    getActiveReservationCounts(),
  ]);

  return records
    .filter((record) => Boolean(record.get("Clase")))
    .map((record) => mapRecordToClase(record, activeCounts.get(record.id) ?? 0))
    .filter((clase) => clase.gimnasioId === gimnasioId)
    .sort((a, b) => (a.fecha ?? "").localeCompare(b.fecha ?? ""));
}

/** Todas las clases con fecha, de cualquier gimnasio — usado por el cron de
 * liquidaciones (no necesita cupos disponibles, así que no calcula reservas
 * activas por clase). */
export async function getAllClasesConFecha(): Promise<Clase[]> {
  const base = getAirtableBase();
  const records = await base("Clases").select().all();
  return records
    .filter((record) => Boolean(record.get("Clase")) && Boolean(record.get("Horario")))
    .map((record) => mapRecordToClase(record, 0));
}

export async function getClaseById(id: string): Promise<Clase | null> {
  const base = getAirtableBase();
  try {
    const record = await base("Clases").find(id);
    const reservados = await countActiveReservationsForClase(id);
    return mapRecordToClase(record, reservados);
  } catch {
    return null;
  }
}
