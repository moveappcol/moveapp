import { getAirtableBase } from "./airtable";
import { cached } from "./server-cache";

const CACHE_TTL_MS = 10_000;

/**
 * Esquema en Airtable — tabla "Parqueaderos" (uno o varios por gimnasio,
 * a mano — no se calculan contra ningún mapa):
 *   - Nombre    (texto — ej. "Parqueadero Calle 90")
 *   - Gimnasio  (link a Gimnasios)
 *   - Latitud   (número)
 *   - Longitud  (número)
 *   - Precio    (texto, opcional — ej. "$4.000/hora")
 */
const PARQUEADEROS_TABLE = "Parqueaderos";

export type Parqueadero = {
  id: string;
  nombre: string;
  lat: number;
  lng: number;
  precio: string | null;
  gimnasioId: string | null;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRecordToParqueadero(record: any): Parqueadero | null {
  const lat = record.get("Latitud") as number | undefined;
  const lng = record.get("Longitud") as number | undefined;
  if (lat === undefined || lng === undefined) return null;

  const gimnasio = record.get("Gimnasio") as string[] | undefined;
  return {
    id: record.id,
    nombre: ((record.get("Nombre") as string) ?? "").trim() || "Parqueadero",
    lat,
    lng,
    precio: ((record.get("Precio") as string) ?? "").trim() || null,
    gimnasioId: gimnasio?.[0] ?? null,
  };
}

/** Trae TODOS los parqueaderos de una — la tabla es chica (unos pocos por
 * gimnasio), así que no vale la pena filtrar por gimnasio en la fórmula
 * (que además no se puede: "Gimnasio" es un link, y ARRAYJOIN sobre un link
 * concatena el NOMBRE del gimnasio, no su id). Se cachea un rato porque
 * esto se pide en cada visita a la página de un gimnasio.
 *
 * Si la tabla "Parqueaderos" todavía no existe en Airtable (falta crearla a
 * mano — la API key no tiene permiso de escritura de schema), Airtable
 * responde 403/404 acá — nunca debe tumbar la página del gimnasio por
 * esto, simplemente no hay parqueaderos que mostrar todavía. */
async function getAllParqueaderos(): Promise<Parqueadero[]> {
  return cached("parqueaderos:all", CACHE_TTL_MS, async () => {
    try {
      const base = getAirtableBase();
      const records = await base(PARQUEADEROS_TABLE).select().all();
      return records
        .map(mapRecordToParqueadero)
        .filter((p): p is Parqueadero => p !== null);
    } catch {
      return [];
    }
  });
}

export async function getParqueaderosForGym(gimnasioId: string): Promise<Parqueadero[]> {
  const todos = await getAllParqueaderos();
  return todos.filter((p) => p.gimnasioId === gimnasioId);
}
