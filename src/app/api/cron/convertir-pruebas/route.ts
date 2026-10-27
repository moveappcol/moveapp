import { NextRequest, NextResponse } from "next/server";
import {
  getDuePruebas,
  marcarConvertida,
  marcarCobroFallidoDefinitivo,
  marcarReintentoProgramado,
} from "@/lib/pruebas";
import { convertirPruebaAStarter } from "@/lib/billing";
import { sendTrialConvertedEmail, sendTrialPaymentFailedEmail, sendOpsAlertEmail } from "@/lib/email";

const OWNER_EMAIL = "gerencia@uniqueappcol.com";

/** Cobra el plan Starter de cada prueba que llegó a su FechaFin sin
 * cancelarse (ver getDuePruebas en pruebas.ts, que ya filtra por si está
 * esperando su reintento de 24h) — mismo patrón que api/cron/billing, con
 * el reintento único que pide el requerimiento. Idempotente: una vez
 * convertida o con "Cobro fallido" definitivo, deja de aparecer en
 * getDuePruebas(), así que correrlo dos veces no cobra dos veces (ver
 * claimPagoAprobado dentro de convertirPruebaAStarter, que tampoco deja
 * acreditar el mismo pago más de una vez). */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const due = await getDuePruebas();
  let convertidas = 0;
  let pendientes = 0;
  let reintentosProgramados = 0;
  let fallidasDefinitivas = 0;

  for (const prueba of due) {
    const result = await convertirPruebaAStarter(prueba);

    if (result.ok) {
      // Si perdimos la carrera contra el webhook (`credited` false), ya se
      // encargó de marcarConvertida y del correo — ver esa rama en
      // api/wompi/webhook.
      if (result.credited) {
        await marcarConvertida(prueba.id);
        await sendTrialConvertedEmail({ correo: prueba.correo, credits: result.credits }).catch(() => {});
      }
      convertidas += 1;
      continue;
    }

    if (result.pending) {
      // El webhook la confirma después (ver pago.tipo==="plan" +
      // getPruebaById en api/wompi/webhook) — no tocamos la prueba todavía,
      // así que el próximo cron la vuelve a intentar si hiciera falta.
      pendientes += 1;
      continue;
    }

    if (prueba.intentoReintento) {
      await marcarCobroFallidoDefinitivo(prueba, result.error);
      await sendTrialPaymentFailedEmail({
        correo: prueba.correo,
        definitivo: true,
        actualizarTarjetaUrl: `${siteUrl}/mi-suscripcion`,
      }).catch(() => {});
      await sendOpsAlertEmail({
        ownerEmail: OWNER_EMAIL,
        asunto: "Prueba UNIQUE: cobro del Starter falló dos veces",
        detalle: `Correo: ${prueba.correo}\nMotivo: ${result.error}\n\nLa cuenta se queda sin plan activo.`,
      }).catch(() => {});
      fallidasDefinitivas += 1;
    } else {
      await marcarReintentoProgramado(prueba.id, result.error);
      await sendTrialPaymentFailedEmail({
        correo: prueba.correo,
        definitivo: false,
        actualizarTarjetaUrl: `${siteUrl}/mi-suscripcion`,
      }).catch(() => {});
      reintentosProgramados += 1;
    }
  }

  return NextResponse.json({
    processed: due.length,
    convertidas,
    pendientes,
    reintentosProgramados,
    fallidasDefinitivas,
  });
}
