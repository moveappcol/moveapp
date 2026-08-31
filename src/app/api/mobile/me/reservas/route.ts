import { NextResponse } from "next/server";
import { getReservationsForUser } from "@/lib/reservations";
import { getClaseById } from "@/lib/classes";
import { getGymById } from "@/lib/gyms";
import { requireMobileUser, mobileAuthErrorResponse } from "@/lib/mobile-auth";

export async function GET() {
  let user;
  try {
    user = await requireMobileUser();
  } catch {
    return mobileAuthErrorResponse();
  }

  const reservations = await getReservationsForUser(user.userName);

  const enriched = await Promise.all(
    reservations.map(async (r) => ({
      id: r.id,
      fecha: r.fecha,
      estado: r.estado,
      calificacion: r.calificacion,
      comentario: r.comentario,
      clase: r.claseId ? await getClaseById(r.claseId) : null,
      gym: r.gimnasioId ? await getGymById(r.gimnasioId) : null,
    }))
  );

  return NextResponse.json({ reservations: enriched });
}
