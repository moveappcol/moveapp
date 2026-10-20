import { getAirtableBase, escapeFormulaValue } from "./airtable";

/**
 * Esquema en Airtable — tabla "Notificaciones" (campana del panel de
 * gimnasios, ver src/app/gimnasio/panel):
 *   - Gimnasio  (link a "Gimnasios" — a quién le pertenece esta notificación)
 *   - Tipo      (texto: "Cancelación" | "Lista de espera" | "Nueva reserva")
 *   - Mensaje   (texto, ya armado y listo para mostrar tal cual)
 *   - Leída     (casilla — false hasta que el gimnasio abre la campana)
 */
const NOTIFICACIONES_TABLE = "Notificaciones";

export type TipoNotificacion = "Cancelación" | "Lista de espera" | "Nueva reserva";

export type Notificacion = {
  id: string;
  tipo: TipoNotificacion;
  mensaje: string;
  leida: boolean;
  createdTime: string;
};

/** Crea una notificación para el panel de un gimnasio. Nunca debe tumbar la
 * acción real que la dispara (una reserva, una cancelación, una entrada a
 * lista de espera ya quedaron hechas) — si esto falla, simplemente no
 * aparece en la campana, sin reintentos. */
export async function crearNotificacion(params: {
  gimnasioId: string;
  tipo: TipoNotificacion;
  mensaje: string;
}): Promise<void> {
  try {
    const base = getAirtableBase();
    await base(NOTIFICACIONES_TABLE).create(
      [
        {
          fields: {
            Gimnasio: [params.gimnasioId],
            Tipo: params.tipo,
            Mensaje: params.mensaje,
            Leída: false,
          },
        },
      ],
      { typecast: true }
    );
  } catch {
    // ver comentario arriba
  }
}

/** Las últimas notificaciones de un gimnasio (leídas y no leídas, más
 * recientes primero) — el panel solo necesita un puñado para la campana,
 * no el historial completo. */
export async function getNotificacionesGimnasio(
  gimnasioId: string,
  limit = 20
): Promise<Notificacion[]> {
  const base = getAirtableBase();
  // No se puede ordenar por la fecha interna de Airtable (createdTime) desde
  // acá — se trae un cupo generoso y se ordena del lado de acá, más abajo.
  const records = await base(NOTIFICACIONES_TABLE)
    .select({
      filterByFormula: `FIND("${escapeFormulaValue(gimnasioId)}", ARRAYJOIN({Gimnasio}))`,
      maxRecords: limit * 3,
    })
    .all();

  return records
    .map((r) => ({
      id: r.id,
      tipo: (r.get("Tipo") as TipoNotificacion) ?? "Nueva reserva",
      mensaje: (r.get("Mensaje") as string) ?? "",
      leida: Boolean(r.get("Leída")),
      createdTime: r._rawJson.createdTime as string,
    }))
    .sort((a, b) => b.createdTime.localeCompare(a.createdTime))
    .slice(0, limit);
}

/** Marca como leídas todas las notificaciones sin leer de un gimnasio —
 * se llama cuando el gimnasio abre la campana. */
export async function marcarNotificacionesLeidas(gimnasioId: string): Promise<void> {
  const base = getAirtableBase();
  const noLeidas = await base(NOTIFICACIONES_TABLE)
    .select({
      filterByFormula: `AND(FIND("${escapeFormulaValue(gimnasioId)}", ARRAYJOIN({Gimnasio})), NOT({Leída}))`,
    })
    .all();

  if (noLeidas.length === 0) return;

  const chunks: string[][] = [];
  for (let i = 0; i < noLeidas.length; i += 10) {
    chunks.push(noLeidas.slice(i, i + 10).map((r) => r.id));
  }
  for (const ids of chunks) {
    await base(NOTIFICACIONES_TABLE).update(
      ids.map((id) => ({ id, fields: { Leída: true } })),
      { typecast: true }
    );
  }
}
