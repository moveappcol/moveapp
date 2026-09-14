import { NextRequest, NextResponse } from "next/server";
import { getAllClasesConFecha } from "@/lib/classes";
import { getReservationsDetailForClase, markRecordatorioEnviado } from "@/lib/reservations";
import { sendClassReminderEmail, sendOpsAlertEmail } from "@/lib/email";
import { getUserCreditsByEmail } from "@/lib/users";
import { sendPushNotification } from "@/lib/push";

const OWNER_EMAIL = "uniqueappcol@gmail.com";

// Ventana centrada en 3 horas antes de la clase — ancha porque el cron
// corre cada pocos minutos y puede atrasarse. Cada reserva se marca como
// avisada apenas se le manda el correo, así que no importa si el cron la
// vuelve a ver dentro de la misma ventana.
const WINDOW_START_MINUTES = 170; // 2h50 antes
const WINDOW_END_MINUTES = 190; // 3h10 antes

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
  const fallos: string[] = [];

  for (const clase of clases) {
    if (!clase.fecha || !clase.gimnasioId) continue;

    const minutesUntilClass = (new Date(clase.fecha).getTime() - now) / (1000 * 60);
    if (minutesUntilClass < WINDOW_START_MINUTES || minutesUntilClass > WINDOW_END_MINUTES) continue;

    const reservas = await getReservationsDetailForClase(clase.id);
    const pendientes = reservas.filter(
      (r) => r.estado !== "Cancelado on time" && !r.recordatorioEnviado
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

  return NextResponse.json({ processed: clases.length, sent, skipped, emailFailed });
}
