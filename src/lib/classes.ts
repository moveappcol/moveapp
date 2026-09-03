import { getAirtableBase } from "./airtable";

export type Clase = {
  id: string;
  name: string;
  credits: number;
  /** Créditos con descuento, si el staff le puso una promoción a esta
   * clase — menor que `credits`. null si no tiene descuento. */
  descuentoCreditos: number | null;
  /** Precio en pesos de esta clase específica, para liquidaciones — nunca
   * se le muestra al usuario. null = usa el precio del gimnasio. */
  precio: number | null;
  cuposTotales: number;
  cuposDisponibles: number;
  fecha: string | null;
  gimnasioId: string | null;
  duracionMinutos: number;
};

/** Los créditos que realmente se cobran al reservar — el descuento si
 * aplica, si no el precio normal. */
export function precioEfectivo(clase: Pick<Clase, "credits" | "descuentoCreditos">): number {
  return clase.descuentoCreditos !== null && clase.descuentoCreditos < clase.credits
    ? clase.descuentoCreditos
    : clase.credits;
}

/**
 * Esquema en Airtable — tabla "Clases":
 *   - Clase          (texto, nombre de la clase)
 *   - Creditos       (número)
 *   - "Descuento creditos" (número, opcional — precio promocional en
 *      créditos, menor que Creditos; vacío = sin descuento)
 *   - Precio         (número, opcional — precio en pesos de esta clase para
 *      liquidaciones; vacío = usa "Precio por reserva" del gimnasio)
 *   - Cupos totales  (número)
 *   - Horario        (fecha y hora — cada fila es una sesión específica,
 *                      no un horario recurrente)
 *   - "Gimnasio "    (link a Gimnasios — OJO: el nombre real trae un espacio al final)
 *   - Duración        (número, en minutos, opcional — si está vacío se asume
 *      60 min; se usa para saber cuándo termina la clase: calificaciones y
 *      el correo "AFTER CLASS")
 *
 * "Numero", "Reservas" y "Reservas 2" existen pero no se usan aquí.
 *
 * Los cupos disponibles se calculan (no se guardan): Cupos totales menos el
 * número de Reservas activas (Estado = "Reservado") para esa clase.
 */
const GIMNASIO_FIELD = "Gimnasio ";
const DEFAULT_DURACION_MINUTOS = 60;

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
  const duracion = record.get("Duración") as number | undefined;
  const descuento = record.get("Descuento creditos") as number | undefined;
  const precio = record.get("Precio") as number | undefined;
  return {
    id: record.id,
    name: (record.get("Clase") as string)?.trim() ?? "Sin nombre",
    credits: (record.get("Creditos") as number) ?? 0,
    descuentoCreditos: descuento !== undefined && descuento !== null ? descuento : null,
    precio: precio !== undefined && precio !== null ? precio : null,
    cuposTotales,
    cuposDisponibles: Math.max(0, cuposTotales - reservados),
    fecha: (record.get("Horario") as string) ?? null,
    gimnasioId: gimnasio?.[0] ?? null,
    duracionMinutos: duracion && duracion > 0 ? duracion : DEFAULT_DURACION_MINUTOS,
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

/** Igual que getClaseById pero sin calcular cuposDisponibles (evita un
 * escaneo completo de "Reservas" por cada llamada) — para listas como "Mis
 * reservas" que no muestran cupos, solo nombre/fecha/duración. */
export async function getClaseByIdBasic(id: string): Promise<Clase | null> {
  const base = getAirtableBase();
  try {
    const record = await base("Clases").find(id);
    return mapRecordToClase(record, 0);
  } catch {
    return null;
  }
}
