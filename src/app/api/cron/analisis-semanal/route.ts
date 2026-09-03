import { NextRequest, NextResponse } from "next/server";
import { getAllClasesConFecha } from "@/lib/classes";
import { getGymById } from "@/lib/gyms";
import { getReservationsDetailForClase } from "@/lib/reservations";
import { toBogotaDateString } from "@/lib/liquidaciones";
import {
  sendWeeklyAnalysisEmail,
  type AnalisisClaseRow,
  type AnalisisGymRow,
} from "@/lib/email";

const OWNER_EMAIL = "uniqueappcol@gmail.com";
const DIAS_ATRAS = 7;
const POCA_DEMANDA_UMBRAL = 0.3;
const NECESITA_CUPOS_UMBRAL = 0.9;

function bogotaDateNDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" });
  return fmt.format(d);
}

function formatFechaHora(iso: string): string {
  return new Date(iso).toLocaleString("es-CO", {
    timeZone: "America/Bogota",
    weekday: "short",
    day: "numeric",
    month: "short",
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

  const desde = bogotaDateNDaysAgo(DIAS_ATRAS - 1);
  const hasta = bogotaDateNDaysAgo(0);
  const periodo = `${desde} al ${hasta}`;

  const clases = await getAllClasesConFecha();
  const enRango = clases.filter((c) => {
    if (!c.fecha) return false;
    const fecha = toBogotaDateString(c.fecha);
    return fecha >= desde && fecha <= hasta;
  });

  const filas: AnalisisClaseRow[] = [];

  for (const clase of enRango) {
    if (!clase.gimnasioId || !clase.fecha) continue;
    const gym = await getGymById(clase.gimnasioId);
    if (!gym) continue;

    const reservas = await getReservationsDetailForClase(clase.id);
    const confirmadas = reservas.filter((r) => r.estado !== "Cancelado on time").length;
    const cupos = clase.cuposTotales;

    filas.push({
      gimnasio: gym.name,
      clase: clase.name,
      horario: formatFechaHora(clase.fecha),
      reservas: confirmadas,
      cupos,
      ocupacion: cupos > 0 ? confirmadas / cupos : 0,
    });
  }

  const porGimnasioMap = new Map<string, AnalisisGymRow>();
  for (const fila of filas) {
    const entry = porGimnasioMap.get(fila.gimnasio) ?? {
      gimnasio: fila.gimnasio,
      clases: 0,
      reservas: 0,
      cupos: 0,
      ocupacion: 0,
    };
    entry.clases += 1;
    entry.reservas += fila.reservas;
    entry.cupos += fila.cupos;
    porGimnasioMap.set(fila.gimnasio, entry);
  }

  const porGimnasio = Array.from(porGimnasioMap.values())
    .map((g) => ({ ...g, ocupacion: g.cupos > 0 ? g.reservas / g.cupos : 0 }))
    .sort((a, b) => b.reservas - a.reservas);

  const pocaDemanda = filas
    .filter((f) => f.cupos > 0 && f.ocupacion <= POCA_DEMANDA_UMBRAL)
    .sort((a, b) => a.ocupacion - b.ocupacion);

  const necesitanCupos = filas
    .filter((f) => f.cupos > 0 && f.ocupacion >= NECESITA_CUPOS_UMBRAL)
    .sort((a, b) => b.ocupacion - a.ocupacion);

  await sendWeeklyAnalysisEmail({
    ownerEmail: OWNER_EMAIL,
    periodo,
    porGimnasio,
    pocaDemanda,
    necesitanCupos,
  });

  return NextResponse.json({
    periodo,
    clasesAnalizadas: filas.length,
    gimnasios: porGimnasio.length,
    pocaDemanda: pocaDemanda.length,
    necesitanCupos: necesitanCupos.length,
  });
}
