import { auth, currentUser } from "@clerk/nextjs/server";
import { getGymByManagerEmail, type GymManagerInfo } from "@/lib/gyms";
import { getClassesForGym, precioEfectivo } from "@/lib/classes";
import { fetchAllReservasDetalle, filterReservationsDetailForClase } from "@/lib/reservations";
import { getAllWaitingEntries } from "@/lib/waitlist";

export type PanelClase = {
  id: string;
  name: string;
  fecha: string | null;
  credits: number;
  cuposTotales: number;
  activas: { id: string; userName: string; molestias: string }[];
  canceladas: { id: string; userName: string }[];
  esperando: { id: string; nombre: string; correo: string }[];
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

export async function loadPanelClases(gymId: string): Promise<PanelClase[]> {
  const [clases, todasLasReservas, esperandoTodos] = await Promise.all([
    getClassesForGym(gymId),
    fetchAllReservasDetalle(),
    getAllWaitingEntries(),
  ]);

  const proximas = clases.filter((c) => esProxima(c.fecha));

  return proximas.map((clase) => {
    const reservas = clase.fecha
      ? filterReservationsDetailForClase(todasLasReservas, clase.id, clase.fecha)
      : [];
    const activas = reservas.filter((r) => !r.estado.startsWith("Cancelado"));
    const canceladas = reservas.filter((r) => r.estado.startsWith("Cancelado"));
    const esperando = esperandoTodos.filter((e) => e.claseId === clase.id);

    return {
      id: clase.id,
      name: clase.name,
      fecha: clase.fecha,
      credits: precioEfectivo(clase),
      cuposTotales: clase.cuposTotales,
      activas: activas.map((r) => ({ id: r.id, userName: r.userName, molestias: r.molestias })),
      canceladas: canceladas.map((r) => ({ id: r.id, userName: r.userName })),
      esperando: esperando.map((e) => ({ id: e.id, nombre: e.nombre, correo: e.correo })),
    };
  });
}
