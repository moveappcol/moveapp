import { getAirtableBase } from "./airtable";

export type Clase = {
  id: string;
  name: string;
  credits: number;
  cuposTotales: number;
  horario: string | null;
  gimnasioId: string | null;
};

/**
 * Esquema en Airtable — tabla "Clases":
 *   - Clase          (texto, nombre de la clase)
 *   - Creditos       (número)
 *   - Cupos totales  (número)
 *   - Horario        (texto libre, informativo — no se interpreta)
 *   - "Gimnasio "    (link a Gimnasios — OJO: el nombre real trae un espacio al final)
 *
 * "Numero", "Reservas" y "Reservas 2" existen pero no se usan aquí.
 */
const GIMNASIO_FIELD = "Gimnasio ";

export async function getClassesForGym(gimnasioId: string): Promise<Clase[]> {
  const base = getAirtableBase();
  // Se filtra en JS en vez de con filterByFormula: ARRAYJOIN sobre un campo
  // de enlace concatena los nombres de los registros vinculados, no sus IDs,
  // así que no se puede buscar el gimnasioId directamente en una fórmula.
  const records = await base("Clases").select().all();

  return records
    .filter((record) => Boolean(record.get("Clase")))
    .map((record) => {
      const gimnasio = record.get(GIMNASIO_FIELD) as string[] | undefined;
      return {
        id: record.id,
        name: (record.get("Clase") as string) ?? "Sin nombre",
        credits: (record.get("Creditos") as number) ?? 0,
        cuposTotales: (record.get("Cupos totales") as number) ?? 0,
        horario: (record.get("Horario") as string)?.trim() || null,
        gimnasioId: gimnasio?.[0] ?? null,
      };
    })
    .filter((clase) => clase.gimnasioId === gimnasioId);
}

export async function getClaseById(id: string): Promise<Clase | null> {
  const base = getAirtableBase();
  try {
    const record = await base("Clases").find(id);
    const gimnasio = record.get(GIMNASIO_FIELD) as string[] | undefined;
    return {
      id: record.id,
      name: (record.get("Clase") as string) ?? "Sin nombre",
      credits: (record.get("Creditos") as number) ?? 0,
      cuposTotales: (record.get("Cupos totales") as number) ?? 0,
      horario: (record.get("Horario") as string)?.trim() || null,
      gimnasioId: gimnasio?.[0] ?? null,
    };
  } catch {
    return null;
  }
}
