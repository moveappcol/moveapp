import { getAirtableBase } from "./airtable";

const LISTA_ESPERA_TABLE = "ListaEspera";

/**
 * Esquema en Airtable — tabla "ListaEspera" (nueva, hay que crearla a mano):
 *   - Clase   (link a Clases)
 *   - Correo  (texto)
 *   - Nombre  (texto)
 *   - Estado  (selección: "Esperando" | "Promovido" | "Cancelado")
 */
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
    claseId: (r.get("Clase") as string[] | undefined)?.[0] ?? "",
    correo: ((r.get("Correo") as string) ?? "").trim(),
    nombre: ((r.get("Nombre") as string) ?? "").trim(),
    estado: ((r.get("Estado") as string) ?? "Esperando") as WaitlistEntry["estado"],
    creadoEn: r._rawJson.createdTime,
  };
}

async function getEntriesForClase(claseId: string): Promise<WaitlistEntry[]> {
  const base = getAirtableBase();
  const records = await base(LISTA_ESPERA_TABLE).select().all();
  return records
    .map(mapRecord)
    .filter((e) => e.claseId === claseId)
    .sort((a, b) => a.creadoEn.localeCompare(b.creadoEn));
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
  await base(LISTA_ESPERA_TABLE).create(
    [
      {
        fields: {
          Clase: [params.claseId],
          Correo: params.correo,
          Nombre: params.nombre,
          Estado: "Esperando",
        },
      },
    ],
    { typecast: true }
  );

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
