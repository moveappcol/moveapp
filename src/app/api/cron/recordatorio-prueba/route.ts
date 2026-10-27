import { NextRequest, NextResponse } from "next/server";
import { getPruebasParaRecordatorio, marcarRecordatorioEnviado } from "@/lib/pruebas";
import { sendTrialReminderEmail, sendOpsAlertEmail } from "@/lib/email";

const OWNER_EMAIL = "gerencia@uniqueappcol.com";

/** Corre varias veces al día (como los demás recordatorios de clase): manda
 * el aviso de 48h antes del fin de la prueba una sola vez por prueba (ver
 * RecordatorioEnviado en pruebas.ts). */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const pendientes = await getPruebasParaRecordatorio();
  let enviados = 0;
  const fallos: string[] = [];

  for (const prueba of pendientes) {
    try {
      await sendTrialReminderEmail({
        correo: prueba.correo,
        fechaFin: prueba.fechaFin,
        cancelarUrl: `${siteUrl}/mi-suscripcion`,
      });
      await marcarRecordatorioEnviado(prueba.id);
      enviados += 1;
    } catch (err) {
      fallos.push(`${prueba.correo}: ${err instanceof Error ? err.message : "error desconocido"}`);
    }
  }

  if (fallos.length > 0) {
    await sendOpsAlertEmail({
      ownerEmail: OWNER_EMAIL,
      asunto: "No se pudieron mandar algunos recordatorios de Prueba UNIQUE",
      detalle: `No se pudo mandar el recordatorio de 48h a:\n\n${fallos.join("\n")}\n\nSe reintenta en la próxima corrida.`,
    });
  }

  return NextResponse.json({ procesados: pendientes.length, enviados, fallos });
}
