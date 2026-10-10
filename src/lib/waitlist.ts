import { getAirtableBase, escapeFormulaValue } from "./airtable";
import { getClaseByIdBasic } from "./classes";
import { getGymBillingInfo } from "./gyms";
import { sendNewWaitlistEmail } from "./email";

const LISTA_ESPERA_TABLE = "Lista de espera";
const OWNER_EMAIL = "gerencia@uniqueappcol.com";

/**
 * Esquema en Airtable — tabla "Lista de espera":
 *   - Clase          (texto — el id del record de Clases, NO un link; así se
 *      puede filtrar directo por igualdad en una fórmula, ver getEntriesForClase)
 *   - ClaseVinculada  (link a Clases, opcional — mismo dato que "Clase" pero
 *      como vínculo de verdad, SOLO para que se pueda ver el nombre/horario
 *      de la clase desde la vista de Airtable con un par de Lookup; la app
 *      nunca lee ni filtra por este campo, solo lo escribe. Si todavía no
 *      existe como columna en Airtable, se guarda igual sin él — ver el
 *      try/catch en joinWaitlist)
 *   - Correo  (texto)
 *   - Nombre  (texto)
 *   - Estado  (selección: "Esperando" | "Promovido" | "Cancelado")
 */
export type JoinWaitlistResult =
  | { ok: true; posicion: number }
  | { ok: false; error: string; code?: "perfil_incompleto" | "ya_reservada" };

export type WaitlistEntry = {
  id: string;
  claseId: string;
  correo: string;
  nombre: string;
  estado: "Esperando" | "Promovido" | "Cancelado";
  creadoEn: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRecord(r: any): WaitlistEntry {
  return {
    id: r.id,
    claseId: (r.get("Clase") as string) ?? "",
    correo: ((r.get("Correo") as string) ?? "").trim(),
    nombre: ((r.get("Nombre") as string) ?? "").trim(),
    estado: ((r.get("Estado") as string) ?? "Esperando") as WaitlistEntry["estado"],
    creadoEn: r._rawJson.createdTime,
  };
}

/** Antes traía la tabla "Lista de espera" COMPLETA — y se llama una vez POR
 * CADA clase llena cuando alguien logueado entra a la página de un
 * gimnasio (ver getWaitlistStatus más abajo), así que una sola visita con
 * varias clases llenas repetía el mismo select().all() varias veces. "Clase"
 * es texto plano (no un link), así que sí se puede filtrar directo por
 * igualdad en la fórmula, sin el problema de ARRAYJOIN de otros campos. */
async function getEntriesForClase(claseId: string): Promise<WaitlistEntry[]> {
  const base = getAirtableBase();
  const records = await base(LISTA_ESPERA_TABLE)
    .select({ filterByFormula: `{Clase} = "${escapeFormulaValue(claseId)}"` })
    .all();
  return records.map(mapRecord).sort((a, b) => a.creadoEn.localeCompare(b.creadoEn));
}

export async function getWaitlistStatus(
  claseId: string,
  correo: string
): Promise<{ enEspera: boolean; posicion: number | null }> {
  const esperando = (await getEntriesForClase(claseId)).filter((e) => e.estado === "Esperando");
  const idx = esperando.findIndex((e) => e.correo.toLowerCase() === correo.toLowerCase());
  return { enEspera: idx !== -1, posicion: idx === -1 ? null : idx + 1 };
}

/** Si la persona ya estaba esperando, devuelve su posición actual sin
 * duplicar el registro. */
export async function joinWaitlist(params: {
  claseId: string;
  correo: string;
  nombre: string;
}): Promise<{ posicion: number }> {
  const entries = await getEntriesForClase(params.claseId);
  const esperando = entries.filter((e) => e.estado === "Esperando");
  const yaEsperando = esperando.find((e) => e.correo.toLowerCase() === params.correo.toLowerCase());
  if (yaEsperando) {
    return { posicion: esperando.findIndex((e) => e.id === yaEsperando.id) + 1 };
  }

  const base = getAirtableBase();
  const baseFields = {
    Clase: params.claseId,
    Correo: params.correo,
    Nombre: params.nombre,
    Estado: "Esperando",
  };
  try {
    await base(LISTA_ESPERA_TABLE).create(
      [{ fields: { ...baseFields, ClaseVinculada: [params.claseId] } }],
      { typecast: true }
    );
  } catch {
    // "ClaseVinculada" todavía no existe como columna en Airtable — no hay
    // por qué perder la entrada real a la lista de espera por un campo que
    // es solo para verse bonito, se reintenta sin él.
    await base(LISTA_ESPERA_TABLE).create([{ fields: baseFields }], { typecast: true });
  }

  const clase = await getClaseByIdBasic(params.claseId);
  const gym = clase?.gimnasioId ? await getGymBillingInfo(clase.gimnasioId) : null;
  await sendNewWaitlistEmail({
    ownerEmail: OWNER_EMAIL,
    gymEmail: gym?.email ?? null,
    userName: params.nombre,
    userEmail: params.correo,
    gimnasio: gym?.name ?? "",
    fechaISO: clase?.fecha ?? null,
  });

  return { posicion: esperando.length + 1 };
}

export async function leaveWaitlist(claseId: string, correo: string): Promise<void> {
  const entries = await getEntriesForClase(claseId);
  const mine = entries.find(
    (e) => e.estado === "Esperando" && e.correo.toLowerCase() === correo.toLowerCase()
  );
  if (!mine) return;
  const base = getAirtableBase();
  await base(LISTA_ESPERA_TABLE).update([{ id: mine.id, fields: { Estado: "Cancelado" } }], {
    typecast: true,
  });
}

/** Las personas en espera de una clase, en orden — la primera es la
 * siguiente en promoverse si se libera un cupo. */
export async function getWaitingInOrder(claseId: string): Promise<WaitlistEntry[]> {
  return (await getEntriesForClase(claseId)).filter((e) => e.estado === "Esperando");
}

export async function markWaitlistPromoted(entryId: string): Promise<void> {
  const base = getAirtableBase();
  await base(LISTA_ESPERA_TABLE).update([{ id: entryId, fields: { Estado: "Promovido" } }], {
    typecast: true,
  });
}

/** El gimnasio rechaza manualmente a alguien de su lista de espera desde el
 * panel (ver negarListaEspera en app/gimnasio/panel/actions.ts) — misma
 * transición de estado que cuando la propia persona se sale de la lista. */
export async function markWaitlistDenied(entryId: string): Promise<void> {
  const base = getAirtableBase();
  await base(LISTA_ESPERA_TABLE).update([{ id: entryId, fields: { Estado: "Cancelado" } }], {
    typecast: true,
  });
}

/** Todas las entradas "Esperando" de CUALQUIER clase, en una sola llamada —
 * para el cron que revisa cupos liberados a mano en Airtable (ver
 * promoverListasDeEsperaConCupo en reservations.ts), que si no tocaría
 * consultar clase por clase. */
export async function getAllWaitingEntries(): Promise<WaitlistEntry[]> {
  const base = getAirtableBase();
  const records = await base(LISTA_ESPERA_TABLE)
    .select({ filterByFormula: `{Estado} = "Esperando"` })
    .all();
  return records.map(mapRecord).sort((a, b) => a.creadoEn.localeCompare(b.creadoEn));
}
