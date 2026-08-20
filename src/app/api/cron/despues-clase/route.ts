import { NextRequest, NextResponse } from "next/server";
import { getAllClasesConFecha } from "@/lib/classes";
import { getReservationsDetailForClase, markCorreoDespuesClaseEnviado } from "@/lib/reservations";
import { sendAfterClassEmail } from "@/lib/email";

// Ventana angosta justo después de que termina la clase (fecha + duración)
// — ancha lo suficiente para que el cron (cada 5 min) no se la salte, pero
// sin disparar horas después. Cada reserva se marca como avisada apenas se
// le manda el correo, así que no importa si el cron la vuelve a ver.
const WINDOW_START_MINUTES = 0;
const WINDOW_END_MINUTES = 15;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const clases = await getAllClasesConFecha();
  const now = Date.now();

  let sent = 0;
  let skipped = 0;
  let emailFailed = 0;

  for (const clase of clases) {
    if (!clase.fecha || !clase.gimnasioId) continue;

    const finClase = new Date(clase.fecha).getTime() + clase.duracionMinutos * 60_000;
    const minutesSinceEnd = (now - finClase) / (1000 * 60);
    if (minutesSinceEnd < WINDOW_START_MINUTES || minutesSinceEnd > WINDOW_END_MINUTES) continue;

    const reservas = await getReservationsDetailForClase(clase.id);
    const pendientes = reservas.filter(
      (r) => r.estado !== "Cancelado on time" && !r.correoDespuesClaseEnviado
    );

    for (const r of pendientes) {
      if (!r.correo) {
        skipped += 1;
        continue;
      }

      try {
        await sendAfterClassEmail({ userEmail: r.correo });
        await markCorreoDespuesClaseEnviado(r.id);
        sent += 1;
      } catch {
        emailFailed += 1;
      }
    }
  }

  return NextResponse.json({ processed: clases.length, sent, skipped, emailFailed });
}
