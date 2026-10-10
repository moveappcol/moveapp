import { auth, currentUser } from "@clerk/nextjs/server";
import { getGymByManagerEmail, type GymManagerInfo } from "@/lib/gyms";
import { getClassesForGym, precioEfectivo } from "@/lib/classes";
import { fetchAllReservasDetalle, filterReservationsDetailForClase } from "@/lib/reservations";
import { getAllWaitingEntries } from "@/lib/waitlist";
import { DAY_KEY_FORMATTER, formatFechaLarga } from "@/lib/dias";

export type PanelClase = {
  id: string;
  name: string;
  fecha: string;
  credits: number;
  cuposTotales: number;
  activas: { id: string; userName: string; molestias: string }[];
  canceladas: { id: string; userName: string }[];
  esperando: { id: string; nombre: string; correo: string }[];
};

/** Las clases próximas del gimnasio, agrupadas por día calendario (hora de
 * Bogotá) — un grupo por "lunes 12 de octubre", etc., igual que el
 * explorador "por día" que ve el cliente. */
export type PanelDia = {
  key: string;
  label: string;
  clases: PanelClase[];
};

export async function requireGymManager(): Promise<GymManagerInfo | null> {
  const { userId } = await auth();
  if (!userId) return null;
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  if (!email) return null;
  return getGymByManagerEmail(email);
}

function esProxima(fecha: string | null): boolean {
  return Boolean(fecha) && new Date(fecha as string).getTime() > Date.now();
}

async function loadPanelClases(gymId: string): Promise<PanelClase[]> {
  const [clases, todasLasReservas, esperandoTodos] = await Promise.all([
    getClassesForGym(gymId),
    fetchAllReservasDetalle(),
    getAllWaitingEntries(),
  ]);

  const proximas = clases.filter((c) => c.fecha !== null && esProxima(c.fecha));

  return proximas.map((clase) => {
    const fecha = clase.fecha as string;
    const reservas = filterReservationsDetailForClase(todasLasReservas, clase.id, fecha);
    const activas = reservas.filter((r) => !r.estado.startsWith("Cancelado"));
    const canceladas = reservas.filter((r) => r.estado.startsWith("Cancelado"));
    const esperando = esperandoTodos.filter((e) => e.claseId === clase.id);

    return {
      id: clase.id,
      name: clase.name,
      fecha,
      credits: precioEfectivo(clase),
      cuposTotales: clase.cuposTotales,
      activas: activas.map((r) => ({ id: r.id, userName: r.userName, molestias: r.molestias })),
      canceladas: canceladas.map((r) => ({ id: r.id, userName: r.userName })),
      esperando: esperando.map((e) => ({ id: e.id, nombre: e.nombre, correo: e.correo })),
    };
  });
}

export async function loadPanelDias(gymId: string): Promise<PanelDia[]> {
  const clases = await loadPanelClases(gymId);

  const porDia = new Map<string, PanelClase[]>();
  for (const clase of clases) {
    const key = DAY_KEY_FORMATTER.format(new Date(clase.fecha));
    const grupo = porDia.get(key);
    if (grupo) {
      grupo.push(clase);
    } else {
      porDia.set(key, [clase]);
    }
  }

  return [...porDia.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, clasesDelDia]) => ({
      key,
      label: formatFechaLarga(clasesDelDia[0].fecha),
      clases: clasesDelDia,
    }));
}
