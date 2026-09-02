import { NextResponse } from "next/server";
import { getReservationsForUser } from "@/lib/reservations";
import { getClaseByIdBasic } from "@/lib/classes";
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
    reservations.map(async (r) => {
      const [clase, gym] = await Promise.all([
        r.claseId ? getClaseByIdBasic(r.claseId) : Promise.resolve(null),
        r.gimnasioId ? getGymById(r.gimnasioId) : Promise.resolve(null),
      ]);
      return {
        id: r.id,
        fecha: r.fecha,
        estado: r.estado,
        calificacion: r.calificacion,
        comentario: r.comentario,
        clase,
        gym,
      };
    })
  );

  return NextResponse.json({ reservations: enriched });
}
