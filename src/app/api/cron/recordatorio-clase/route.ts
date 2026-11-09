import { NextRequest, NextResponse } from "next/server";
import { getAllClasesConFecha } from "@/lib/classes";
import {
  fetchAllReservasDetalle,
  filterReservationsDetailForClase,
  markRecordatorioEnviado,
  markRecordatorioCancelacionEnviado,
  CANCELLATION_WINDOW_HOURS,
} from "@/lib/reservations";
import { formatFechaLarga as formatFechaConDia } from "@/lib/dias";
import {
  sendClassReminderEmail,
  sendCancellationWindowReminderEmail,
  sendOpsAlertEmail,
} from "@/lib/email";
import { getUserCreditsByEmail } from "@/lib/users";
import { sendPushNotification } from "@/lib/push";
import { getGymById } from "@/lib/gyms";

/** Link de Maps con la ubicación del gimnasio — con coordenadas si las
 * tiene (abre directo la ruta), si no cae a una búsqueda por dirección. */
function buildMapsUrl(gym: { lat: number | null; lng: number | null; address: string }): string | null {
  if (gym.lat !== null && gym.lng !== null) {
    return `https://www.google.com/maps/dir/?api=1&destination=${gym.lat},${gym.lng}`;
  }
  if (gym.address) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(gym.address)}`;
  }
  return null;
}

const OWNER_EMAIL = "gerencia@uniqueappcol.com";

// Ventana centrada en 3 horas antes de la clase — ancha porque el cron
// corre cada pocos minutos y puede atrasarse. Cada reserva se marca como
// avisada apenas se le manda el correo, así que no importa si el cron la
// vuelve a ver dentro de la misma ventana.
const WINDOW_START_MINUTES = 170; // 2h50 antes
const WINDOW_END_MINUTES = 190; // 3h10 antes

// Recordatorio de cortesía ~27h antes: "todavía puedes cancelar sin que te
// cobren los créditos hasta 24h antes". Misma lógica de ventana ancha +
// marca por reserva que el de 3h.
const CANCELACION_WINDOW_START_MINUTES = 27 * 60 - 10; // 26h50 antes
const CANCELACION_WINDOW_END_MINUTES = 27 * 60 + 10; // 27h10 antes

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
  const now = Date.now();

  let sent = 0;
  let sentCancelacion = 0;
  let skipped = 0;
  let emailFailed = 0;
  const fallos: string[] = [];
  const fallosCancelacion: string[] = [];

  for (const clase of clases) {
    if (!clase.fecha || !clase.gimnasioId) continue;

    const minutesUntilClass = (new Date(clase.fecha).getTime() - now) / (1000 * 60);

    if (
      minutesUntilClass >= CANCELACION_WINDOW_START_MINUTES &&
      minutesUntilClass <= CANCELACION_WINDOW_END_MINUTES
    ) {
      const gym = await getGymById(clase.gimnasioId);
      const limiteCancelacion = new Date(
        new Date(clase.fecha).getTime() - CANCELLATION_WINDOW_HOURS * 60 * 60_000
      ).toISOString();
      const reservas = filterReservationsDetailForClase(todasLasReservas, clase.id, clase.fecha);
      const pendientes = reservas.filter(
        (r) => !r.estado.startsWith("Cancelado") && !r.recordatorioCancelacionEnviado
      );

      for (const r of pendientes) {
        if (!r.correo) {
          skipped += 1;
          continue;
        }

        // Se marca ANTES de mandar (al revés que el de 3h): si la marca no
        // se puede guardar, no se manda — si no, el cron lo reenviaría en
        // cada corrida de la ventana. Perder este correo de cortesía es
        // mejor que mandarlo 4 veces.
        try {
          await markRecordatorioCancelacionEnviado(r.id);
          await sendCancellationWindowReminderEmail({
            userEmail: r.correo,
            nombre: r.userName,
            clase: clase.name,
            fechaLarga: formatFechaConDia(clase.fecha),
            hora: formatHora(clase.fecha),
            gimnasio: gym?.name ?? null,
            limiteCancelacion: `${formatFechaConDia(limiteCancelacion)} a las ${formatHora(limiteCancelacion)}`,
          });
          sentCancelacion += 1;
        } catch (err) {
          emailFailed += 1;
          const motivo = err instanceof Error ? err.message : "error desconocido";
          fallosCancelacion.push(`${r.userName} (${r.correo}) — ${clase.name}: ${motivo}`);
        }
      }
      continue;
    }

    if (minutesUntilClass < WINDOW_START_MINUTES || minutesUntilClass > WINDOW_END_MINUTES) continue;

    const gym = await getGymById(clase.gimnasioId);
    const mapsUrl = gym ? buildMapsUrl(gym) : null;

    const reservas = filterReservationsDetailForClase(todasLasReservas, clase.id, clase.fecha);
    // Cualquier cancelación — a tiempo o tarde ("Cancelado") — ya no va a
    // la clase, así que no le llega ni recordatorio ni correo de después.
    const pendientes = reservas.filter(
      (r) => !r.estado.startsWith("Cancelado") && !r.recordatorioEnviado
    );

    for (const r of pendientes) {
      if (!r.correo) {
        skipped += 1;
        continue;
      }

      try {
        await sendClassReminderEmail({
          userEmail: r.correo,
          nombre: r.userName,
          clase: clase.name,
          fechaLarga: formatFechaLarga(clase.fecha),
          hora: formatHora(clase.fecha),
          gimnasio: gym?.name ?? null,
          mapsUrl,
        });
        const persona = await getUserCreditsByEmail(r.correo);
        await sendPushNotification({
          to: persona?.pushToken ?? null,
          title: "Tu clase es en 3 horas ⏰",
          body: `${clase.name} a las ${formatHora(clase.fecha)}.`,
          data: { type: "recordatorio-clase", claseId: clase.id },
        });
        await markRecordatorioEnviado(r.id);
        sent += 1;
      } catch (err) {
        emailFailed += 1;
        const motivo = err instanceof Error ? err.message : "error desconocido";
        fallos.push(`${r.userName} (${r.correo}) — ${clase.name}: ${motivo}`);
      }
    }
  }

  if (fallos.length > 0) {
    await sendOpsAlertEmail({
      ownerEmail: OWNER_EMAIL,
      asunto: "No se pudo mandar el recordatorio de clase",
      detalle: `No se pudo avisar a estas personas que su clase es en 3 horas:\n\n${fallos.join("\n")}\n\nSu clase ya está por empezar — si quieres avisarles manual (WhatsApp/llamada), toca hacerlo ya.`,
    });
  }

  if (fallosCancelacion.length > 0) {
    await sendOpsAlertEmail({
      ownerEmail: OWNER_EMAIL,
      asunto: "No se pudo mandar el recordatorio de 27h (cancelar sin costo)",
      detalle: `No se pudo avisar a estas personas que todavía pueden cancelar sin costo hasta 24h antes:\n\n${fallosCancelacion.join("\n")}\n\nSi el error dice que no existe el campo "Recordatorio cancelacion enviado", hay que crear ese checkbox en la tabla Reservas de Airtable.`,
    });
  }

  return NextResponse.json({ processed: clases.length, sent, sentCancelacion, skipped, emailFailed });
}
