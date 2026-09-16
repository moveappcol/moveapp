import { NextRequest, NextResponse } from "next/server";
import { getAirtableBase } from "@/lib/airtable";
import { getClaseById } from "@/lib/classes";
import { getGymBillingInfo } from "@/lib/gyms";
import { getReservationsDetailForClase } from "@/lib/reservations";
import {
  findLiquidacion,
  updateLiquidacionCounts,
  buildCountsFromReservas,
  toBogotaDateString,
} from "@/lib/liquidaciones";

/** Automatización de Airtable → "cuando cambia el Estado de una reserva,
 * recalcula lo que se le paga al gimnasio de esa clase". Se dispara desde
 * un "Run a script" en Airtable (no desde "Send webhook" directo, porque
 * necesitamos mandar el Bearer del CRON_SECRET) — ver instrucciones en el
 * chat de configuración. Si la liquidación de esa clase todavía no existe
 * (falta para las 24h antes), no hace nada — se calculará bien cuando se
 * cree normalmente. */
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const reservaId = body?.reservaId as string | undefined;
  if (!reservaId) {
    return NextResponse.json({ error: "Falta reservaId." }, { status: 400 });
  }

  const base = getAirtableBase();
  let record;
  try {
    record = await base("Reservas").find(reservaId);
  } catch {
    return NextResponse.json({ ok: true, skipped: "reserva no encontrada (¿se borró?)" });
  }

  const claseId = (record.get("Clase") as string[] | undefined)?.[0];
  if (!claseId) return NextResponse.json({ ok: true, skipped: "reserva sin clase" });

  const clase = await getClaseById(claseId);
  if (!clase || !clase.fecha || !clase.gimnasioId) {
    return NextResponse.json({ ok: true, skipped: "clase sin fecha o gimnasio" });
  }

  const gym = await getGymBillingInfo(clase.gimnasioId);
  if (!gym) return NextResponse.json({ ok: true, skipped: "gimnasio no encontrado" });

  const fecha = toBogotaDateString(clase.fecha);
  const liquidacion = await findLiquidacion(gym.name, clase.name, fecha);
  if (!liquidacion) {
    return NextResponse.json({ ok: true, skipped: "todavía no existe liquidación para esta clase" });
  }

  const reservas = await getReservationsDetailForClase(claseId);
  const precio = clase.precio ?? gym.pricePerReservation;
  const counts = buildCountsFromReservas(reservas, clase.credits, clase.tipo, precio, {
    tipoA: gym.porcentajeTipoA,
    tipoB: gym.porcentajeTipoB,
  });
  const totals = await updateLiquidacionCounts(liquidacion.id, counts);

  return NextResponse.json({ ok: true, totals });
}
