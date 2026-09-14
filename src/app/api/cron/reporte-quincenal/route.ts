import { NextRequest, NextResponse } from "next/server";
import { getAllClasesConFecha } from "@/lib/classes";
import { getGymBillingInfo } from "@/lib/gyms";
import { getReservationsDetailForClase } from "@/lib/reservations";
import { toBogotaDateString } from "@/lib/liquidaciones";
import { sendReservasTotalesPeriodoEmail, sendFormPagosEmail } from "@/lib/email";
import { reporteQuincenalYaEnviado, marcarReporteQuincenalEnviado } from "@/lib/reportes-quincenales";
import {
  buildReservasTotalesPeriodoPdf,
  buildFormPagosPdf,
  type ReservaPeriodoRow,
  type ReservaPagoRow,
  type GymFormPagos,
} from "@/lib/pdf";

const OWNER_EMAIL = "uniqueappcol@gmail.com";

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Día, mes, año y último día del mes de "hoy" en hora de Bogotá (no la del
 * proceso del servidor, que en producción puede no ser America/Bogota). */
function bogotaTodayParts(): { year: number; month: number; day: number; lastDay: number } {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = fmt.formatToParts(new Date());
  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  const day = Number(parts.find((p) => p.type === "day")?.value);
  const lastDay = new Date(year, month, 0).getDate();
  return { year, month, day, lastDay };
}

function formatFechaCorta(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CO", {
    timeZone: "America/Bogota",
    day: "numeric",
    month: "long",
  });
}

type GymAcumulado = {
  gimnasio: string;
  gymEmail: string | null;
  reservasPeriodo: ReservaPeriodoRow[];
  reservasPago: ReservaPagoRow[];
  totalTipoA: number;
  totalTipoB: number;
  totalAPagar: number;
};

const PORCENTAJE_DEFAULT_A = 0.4;
const PORCENTAJE_DEFAULT_B = 0.3;

type PeriodoResultado = {
  periodo: string;
  gyms: number;
  sentToGyms: number;
  formPagosSent: boolean;
  emailFailed: number;
};

/** Procesa y manda un periodo específico. Se marca como enviado en Airtable
 * al terminar, sin importar si algún correo individual falló (eso ya se
 * reporta en emailFailed) — lo que evita reintentar es haber completado el
 * proceso sin colgarse, no que cada correo puntual haya llegado. */
async function procesarPeriodo(desde: string, hasta: string, periodo: string): Promise<PeriodoResultado> {
  const clases = await getAllClasesConFecha();
  const porGimnasio = new Map<string, GymAcumulado>();

  for (const clase of clases) {
    if (!clase.fecha || !clase.gimnasioId) continue;

    const fecha = toBogotaDateString(clase.fecha);
    if (fecha < desde || fecha > hasta) continue;

    const gym = await getGymBillingInfo(clase.gimnasioId);
    if (!gym) continue;

    const reservas = await getReservationsDetailForClase(clase.id);
    const confirmadas = reservas.filter((r) => r.estado !== "Cancelado on time");
    if (confirmadas.length === 0) continue;

    const entry = porGimnasio.get(gym.name) ?? {
      gimnasio: gym.name,
      gymEmail: gym.email,
      reservasPeriodo: [],
      reservasPago: [],
      totalTipoA: 0,
      totalTipoB: 0,
      totalAPagar: 0,
    };

    const fechaCorta = formatFechaCorta(clase.fecha);
    const porcentajeA = gym.porcentajeTipoA ?? PORCENTAJE_DEFAULT_A;
    const porcentajeB = gym.porcentajeTipoB ?? PORCENTAJE_DEFAULT_B;

    for (const r of confirmadas) {
      entry.reservasPeriodo.push({
        tipo: r.tipo,
        nombre: r.userName,
        cedula: r.cedula,
        clase: clase.name,
        fecha: fechaCorta,
      });

      const porcentaje = r.tipo === "A" ? porcentajeA : r.tipo === "B" ? porcentajeB : null;
      const valorClase = clase.precio ?? gym.pricePerReservation;
      const totalPorReserva = porcentaje !== null && valorClase !== null ? valorClase * porcentaje : null;

      entry.reservasPago.push({
        tipo: r.tipo,
        nombre: r.userName,
        cedula: r.cedula,
        fecha: fechaCorta,
        clase: clase.name,
        porcentaje,
        valorClase,
        totalPorReserva,
      });

      if (r.tipo === "A") entry.totalTipoA += 1;
      if (r.tipo === "B") entry.totalTipoB += 1;
      if (totalPorReserva !== null) entry.totalAPagar += totalPorReserva;
    }

    porGimnasio.set(gym.name, entry);
  }

  const gyms = Array.from(porGimnasio.values()).sort((a, b) => a.gimnasio.localeCompare(b.gimnasio));

  let sentToGyms = 0;
  let emailFailed = 0;

  for (const gym of gyms) {
    try {
      const pdf = await buildReservasTotalesPeriodoPdf({
        periodo,
        gimnasio: gym.gimnasio,
        reservas: gym.reservasPeriodo,
        totalTipoA: gym.totalTipoA,
        totalTipoB: gym.totalTipoB,
      });
      await sendReservasTotalesPeriodoEmail({
        gymEmail: gym.gymEmail,
        ownerEmail: OWNER_EMAIL,
        periodo,
        archivo: `${gym.gimnasio}-${desde}-${hasta}`,
        pdf,
      });
      sentToGyms += 1;
    } catch {
      emailFailed += 1;
    }
  }

  let formPagosSent = false;
  if (gyms.length > 0) {
    const gymsFormPagos: GymFormPagos[] = gyms.map((g) => ({
      gimnasio: g.gimnasio,
      reservas: g.reservasPago,
      totalAPagar: g.totalAPagar,
    }));

    try {
      const pdf = await buildFormPagosPdf({ periodo, gyms: gymsFormPagos });
      await sendFormPagosEmail({ ownerEmail: OWNER_EMAIL, periodo, pdf });
      formPagosSent = true;
    } catch {
      emailFailed += 1;
    }
  }

  return { periodo, gyms: gyms.length, sentToGyms, formPagosSent, emailFailed };
}

/** Corre a diario (el workflow dispara todos los días). Cada periodo (1–14
 * y 15–fin de mes) se considera "pendiente" desde su día de corte (14, o
 * el último día del mes) hasta que quede marcado como enviado en Airtable
 * — así, si el día exacto falla (como pasó una vez: un correo colgado sin
 * timeout trabó todo el envío), se reintenta solo al día siguiente en vez
 * de perderse para siempre.
 *
 * Manda DOS tipos de documento distintos:
 *   - A cada gimnasio: "RESERVAS TOTALES DEL PERIODO" — solo cantidades,
 *     sin plata.
 *   - Solo a Unique: "form pagos" — con porcentaje, valor por reserva y
 *     total a pagar de cada gimnasio (nunca se manda a los gimnasios,
 *     porque cada uno maneja un porcentaje distinto). */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { year, month, day, lastDay } = bogotaTodayParts();

  const periodos = [
    {
      desde: `${year}-${pad(month)}-01`,
      hasta: `${year}-${pad(month)}-14`,
      periodo: `1 al 14 de ${MESES[month - 1]} de ${year}`,
      key: `${year}-${pad(month)}-01_${year}-${pad(month)}-14`,
      diaDeCorte: 14,
    },
    {
      desde: `${year}-${pad(month)}-15`,
      hasta: `${year}-${pad(month)}-${pad(lastDay)}`,
      periodo: `15 al ${lastDay} de ${MESES[month - 1]} de ${year}`,
      key: `${year}-${pad(month)}-15_${year}-${pad(month)}-${pad(lastDay)}`,
      diaDeCorte: lastDay,
    },
  ];

  const resultados: PeriodoResultado[] = [];

  for (const p of periodos) {
    if (day < p.diaDeCorte) continue;
    if (await reporteQuincenalYaEnviado(p.key)) continue;

    const resultado = await procesarPeriodo(p.desde, p.hasta, p.periodo);
    await marcarReporteQuincenalEnviado(p.key);
    resultados.push(resultado);
  }

  if (resultados.length === 0) {
    return NextResponse.json({ skipped: true, reason: "nada pendiente de reportar hoy" });
  }

  return NextResponse.json({ periodos: resultados });
}
