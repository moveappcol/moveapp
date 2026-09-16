import { NextResponse } from "next/server";
import { getGymById, canAccessGymByGenero, GYMS_COMING_SOON } from "@/lib/gyms";
import { getClassesForGym } from "@/lib/classes";
import { requireMobileUser } from "@/lib/mobile-auth";
import { getActiveReservationClaseIds } from "@/lib/reservations";
import { getUserCreditsByEmail } from "@/lib/users";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (GYMS_COMING_SOON && process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "No disponible." }, { status: 404 });
  }

  const { id } = await params;
  const gym = await getGymById(id);
  if (!gym) {
    return NextResponse.json({ error: "Gimnasio no encontrado." }, { status: 404 });
  }

  const classes = await getClassesForGym(id);

  // Explorar gimnasios no requiere cuenta — solo se calculan las clases ya
  // reservadas si hay sesión iniciada; sin cuenta, la lista queda vacía.
  let reservedClaseIds: string[] = [];
  try {
    const user = await requireMobileUser();
    const account = await getUserCreditsByEmail(user.email);
    if (!canAccessGymByGenero(gym.genero, account?.genero ?? null)) {
      return NextResponse.json({ error: "Gimnasio no encontrado." }, { status: 404 });
    }
    reservedClaseIds = [...(await getActiveReservationClaseIds(user.email))];
  } catch {
    // sin sesión — se sigue mostrando el gimnasio igual, sin marcar nada
  }

  return NextResponse.json({ gym, classes, reservedClaseIds });
}
