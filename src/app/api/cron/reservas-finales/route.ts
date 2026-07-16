import { NextRequest, NextResponse } from "next/server";
import { getAllClasesConFecha } from "@/lib/classes";
import { getGymBillingInfo } from "@/lib/gyms";
import { getReservationsDetailForClase } from "@/lib/reservations";
import {
  findLiquidacion,
  createLiquidacion,
  markReservasFinalesEnviadas,
  computeFechaDePago,
  toBogotaDateString,
} from "@/lib/liquidaciones";
import { sendReservasFinalesEmail } from "@/lib/email";
import { buildReservationRtf } from "@/lib/rtf";

const OWNER_EMAIL = "uniqueappcol@gmail.com";
// Ventana amplia porque el cron corre cada pocos minutos y puede atrasarse:
// desde 30 min después de empezar la clase (por si acaso) hasta 15 min antes.
const WINDOW_START_MINUTES = -30;
const WINDOW_END_MINUTES = 15;

function formatFechaLarga(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CO", {
    timeZone: "America/Bogota",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatHora(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-CO", {
    timeZone: "America/Bogota",
    hour: "numeric",
    minute: "2-digit",
  });
}

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

    const minutesUntilClass = (new Date(clase.fecha).getTime() - now) / (1000 * 60);
    if (minutesUntilClass < WINDOW_START_MINUTES || minutesUntilClass > WINDOW_END_MINUTES) continue;

    const gym = await getGymBillingInfo(clase.gimnasioId);
    if (!gym) continue;

    const fecha = toBogotaDateString(clase.fecha);

    let liquidacion = await findLiquidacion(gym.name, clase.name, fecha);
    const reservas = await getReservationsDetailForClase(clase.id);
    const confirmadas = reservas.filter((r) => r.estado !== "Cancelado on time");

    if (!liquidacion) {
      // No debería pasar (la liquidación ya se genera a las 24h), pero por
      // si el cron de las 24h no alcanzó a correr, la creamos igual.
      const { id } = await createLiquidacion({
        gimnasio: gym.name,
        clase: clase.name,
        fecha,
        reservasConfirmadas: confirmadas.length,
        creditosTotales: confirmadas.length * clase.credits,
        precioPorReserva: gym.pricePerReservation,
        detalle: reservas.map((r) => `${r.userName} - ${r.estado}`).join("\n") || "Sin reservas.",
        fechaDePago: computeFechaDePago(clase.fecha),
      });
      liquidacion = { id, reservasFinalesEnviadas: false };
    }

    if (liquidacion.reservasFinalesEnviadas) {
      skipped += 1;
      continue;
    }

    const rtf = buildReservationRtf({
      title: "Reservas finales",
      fecha: formatFechaLarga(clase.fecha),
      gimnasio: gym.name,
      claseName: clase.name,
      horario: formatHora(clase.fecha),
      names: confirmadas.map((r) => r.userName),
    });

    try {
      await sendReservasFinalesEmail({
        gymEmail: gym.email,
        ownerEmail: OWNER_EMAIL,
        gimnasio: gym.name,
        clase: clase.name,
        fecha,
        rtf,
      });
      await markReservasFinalesEnviadas(liquidacion.id);
      sent += 1;
    } catch {
      emailFailed += 1;
    }
  }

  return NextResponse.json({ processed: clases.length, sent, skipped, emailFailed });
}
