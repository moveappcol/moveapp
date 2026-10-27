import { NextRequest, NextResponse } from "next/server";
import { getAllClasesConFecha } from "@/lib/classes";
import { getGymBillingInfo } from "@/lib/gyms";
import {
  fetchAllReservasDetalle,
  filterReservationsDetailForClase,
  marcarListaFinalEnviada,
} from "@/lib/reservations";
import {
  fetchAllLiquidaciones,
  agregarOcurrenciaALiquidacion,
  buildOcurrenciaCounts,
  computeFechaDePago,
  toBogotaDateString,
  claseKeyForLiquidacion,
} from "@/lib/liquidaciones";
import { sendReservasFinalesEmail, sendOpsAlertEmail } from "@/lib/email";
import { buildReservasFinalesPdf } from "@/lib/pdf";

const OWNER_EMAIL = "gerencia@uniqueappcol.com";
// Ventana amplia porque el cron corre cada pocos minutos y puede atrasarse:
// desde 30 min después de empezar la clase (por si acaso) hasta el aviso de
// cada gimnasio (ver reservasFinalesMinutes — normalmente 20 min antes,
// que coincide con el cierre real de reservas, así que a esa altura ya no
// puede llegar gente nueva y la lista sí es final).
const WINDOW_START_MINUTES = -30;

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
  const todasLasReservas = await fetchAllReservasDetalle();
  const todasLasLiquidaciones = await fetchAllLiquidaciones();
  const now = Date.now();

  let sent = 0;
  let skipped = 0;
  let emailFailed = 0;
  const fallos: string[] = [];

  for (const clase of clases) {
    if (!clase.fecha || !clase.gimnasioId) continue;

    const minutesUntilClass = (new Date(clase.fecha).getTime() - now) / (1000 * 60);
    // Filtro grueso antes de tocar Airtable por el gimnasio — ningún
    // gimnasio debería pedir más de 3h de anticipación para su aviso.
    if (minutesUntilClass < WINDOW_START_MINUTES || minutesUntilClass > 180) continue;

    const gym = await getGymBillingInfo(clase.gimnasioId);
    if (!gym) continue;

    if (minutesUntilClass > gym.reservasFinalesMinutes) continue;

    const fecha = toBogotaDateString(clase.fecha);
    const claseKey = claseKeyForLiquidacion(clase.name, clase.fecha);
    const reservas = filterReservationsDetailForClase(todasLasReservas, clase.id, clase.fecha);
    const confirmadas = reservas.filter((r) => r.estado !== "Cancelado on time");

    // "Lista final enviada" vive en cada reserva (ver marcarListaFinalEnviada
    // en reservations.ts) — si cualquiera de las confirmadas ya la tiene
    // marcada, es que este cron ya procesó esta clase antes.
    if (confirmadas.some((r) => r.listaFinalEnviada)) {
      skipped += 1;
      continue;
    }

    const precio = clase.precio ?? gym.pricePerReservation;
    const counts = buildOcurrenciaCounts(reservas, clase.credits, clase.tipo, precio, {
      tipoA: gym.porcentajeTipoA,
      tipoB: gym.porcentajeTipoB,
    });

    // Puede haber reservas nuevas hechas después del corte de 24h — esto
    // crea la liquidación si por algo el cron de 24h no alcanzó a correr,
    // o actualiza los números de esta ocurrencia dentro de su quincena si
    // ya existía (ver agregarOcurrenciaALiquidacion).
    await agregarOcurrenciaALiquidacion({
      gimnasio: gym.name,
      claseKey,
      claseFechaISO: clase.fecha,
      fechaDePago: computeFechaDePago(clase.fecha),
      counts,
      liquidacionesExistentes: todasLasLiquidaciones,
    });

    // Sin reservas no hay lista final que avisar — no se genera ni se
    // manda ningún PDF vacío (y no hay ninguna reserva confirmada a la que
    // marcarle "Lista final enviada", así que simplemente no vuelve a
    // entrar acá para esta clase porque ya no hay nada pendiente).
    if (confirmadas.length === 0) {
      skipped += 1;
      continue;
    }

    const pdf = await buildReservasFinalesPdf({
      variant: { kind: "antes", minutos: gym.reservasFinalesMinutes },
      fecha: formatFechaLarga(clase.fecha),
      gimnasio: gym.name,
      clase: clase.name,
      hora: formatHora(clase.fecha),
      reservas: confirmadas.map((r) => ({
        tipo: clase.tipo,
        nombre: r.userName,
        cedula: r.cedula,
        molestias: r.molestias,
      })),
    });

    try {
      await sendReservasFinalesEmail({
        gymEmail: gym.email,
        ownerEmail: OWNER_EMAIL,
        clase: clase.name,
        asistentes: confirmadas.map((r) => r.userName),
        archivo: `${clase.name}-${fecha}`,
        pdf,
      });
      await marcarListaFinalEnviada(confirmadas.map((r) => r.id));
      sent += 1;
    } catch (err) {
      emailFailed += 1;
      const motivo = err instanceof Error ? err.message : "error desconocido";
      fallos.push(`${gym.name} — ${clase.name} (${fecha}): ${motivo}`);
    }
  }

  if (fallos.length > 0) {
    await sendOpsAlertEmail({
      ownerEmail: OWNER_EMAIL,
      asunto: "No se pudo mandar la lista final de asistentes",
      detalle: `No se pudo avisar a estos gimnasios de su lista final de asistentes:\n\n${fallos.join("\n")}\n\nToca avisarles manual mientras se revisa qué pasó — la clase ya está por empezar.`,
    });
  }

  return NextResponse.json({ processed: clases.length, sent, skipped, emailFailed });
}
