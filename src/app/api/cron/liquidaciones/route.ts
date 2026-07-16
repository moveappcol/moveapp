import { NextRequest, NextResponse } from "next/server";
import { getAllClasesConFecha } from "@/lib/classes";
import { getGymBillingInfo } from "@/lib/gyms";
import { getReservationsDetailForClase } from "@/lib/reservations";
import { liquidacionExists, createLiquidacion, computeFechaDePago, toBogotaDateString } from "@/lib/liquidaciones";
import { sendLiquidacionEmail } from "@/lib/email";
import { buildReservationRtf } from "@/lib/rtf";

const OWNER_EMAIL = "uniqueappcol@gmail.com";
const LOCK_IN_HOURS = 24;

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

  let generated = 0;
  let skipped = 0;
  let emailFailed = 0;

  for (const clase of clases) {
    if (!clase.fecha || !clase.gimnasioId) continue;

    const hoursUntilClass = (new Date(clase.fecha).getTime() - now) / (1000 * 60 * 60);
    if (hoursUntilClass > LOCK_IN_HOURS) continue; // todavía se puede cancelar gratis

    const gym = await getGymBillingInfo(clase.gimnasioId);
    if (!gym) continue;

    const fecha = toBogotaDateString(clase.fecha);

    if (await liquidacionExists(gym.name, clase.name, fecha)) {
      skipped += 1;
      continue;
    }

    const reservas = await getReservationsDetailForClase(clase.id);
    const confirmadas = reservas.filter((r) => r.estado !== "Cancelado on time");

    const { totalAPagar } = await createLiquidacion({
      gimnasio: gym.name,
      clase: clase.name,
      fecha,
      reservasConfirmadas: confirmadas.length,
      creditosTotales: confirmadas.length * clase.credits,
      precioPorReserva: gym.pricePerReservation,
      detalle: reservas.map((r) => `${r.userName} - ${r.estado}`).join("\n") || "Sin reservas.",
      fechaDePago: computeFechaDePago(clase.fecha),
    });

    generated += 1;

    const rtf = buildReservationRtf({
      title: "Pre reservas 24h antes",
      fecha: formatFechaLarga(clase.fecha),
      gimnasio: gym.name,
      claseName: clase.name,
      horario: formatHora(clase.fecha),
      names: confirmadas.map((r) => r.userName),
    });

    try {
      await sendLiquidacionEmail({
        gymEmail: gym.email,
        ownerEmail: OWNER_EMAIL,
        gimnasio: gym.name,
        clase: clase.name,
        fecha,
        reservasConfirmadas: confirmadas.length,
        totalAPagar,
        rtf,
      });
    } catch {
      emailFailed += 1;
    }
  }

  return NextResponse.json({ processed: clases.length, generated, skipped, emailFailed });
}
