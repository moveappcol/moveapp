import { NextResponse } from "next/server";
import { getGyms, filterGymsByGenero, esGimnasioDeExperiencias, GYMS_COMING_SOON } from "@/lib/gyms";
import { getAllClasesDeTodosLosGimnasios } from "@/lib/classes";
import { requireMobileUser } from "@/lib/mobile-auth";
import { getUserCreditsByEmail } from "@/lib/users";
import { getActiveReservationClaseIds } from "@/lib/reservations";

/** Todas las clases de todos los gimnasios (equivalente móvil del
 * "Explorar por día" de la web, ver classes-by-day-explorer.tsx) — un solo
 * viaje para que la app arme el filtro por día/actividad en el cliente, en
 * vez de pedir clase por gimnasio. Excluye el gimnasio "Experiencias"
 * (no tiene horario de clases como los demás) y respeta el filtro de
 * género, igual que /gyms y /gimnasios/[id]. */
export async function GET() {
  if (GYMS_COMING_SOON && process.env.NODE_ENV !== "development") {
    return NextResponse.json({ comingSoon: true, gyms: [], classes: [], reservedClaseIds: [] });
  }

  const { gyms: allGyms } = await getGyms();

  let userGenero: string | null = null;
  let reservedClaseIds: string[] = [];
  try {
    const user = await requireMobileUser();
    const account = await getUserCreditsByEmail(user.email);
    userGenero = account?.genero ?? null;
    reservedClaseIds = [...(await getActiveReservationClaseIds(user.email))];
  } catch {
    // Explorar por día no requiere cuenta — sin sesión se ve todo, sin
    // restringir por género ni marcar reservas propias.
  }

  const gyms = filterGymsByGenero(allGyms, userGenero).filter((g) => !esGimnasioDeExperiencias(g.name));
  const gymIds = new Set(gyms.map((g) => g.id));

  const allClasses = await getAllClasesDeTodosLosGimnasios();
  const classes = allClasses.filter((c) => c.gimnasioId && gymIds.has(c.gimnasioId));

  return NextResponse.json({
    comingSoon: false,
    gyms: gyms.map((g) => ({ id: g.id, name: g.name, activities: g.activities })),
    classes,
    reservedClaseIds,
  });
}
