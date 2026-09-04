import { NextRequest, NextResponse } from "next/server";
import { findStuckPendingPagos, findFailedSubscriptions } from "@/lib/salud";

/** Chequeos de salud que necesitan leer Airtable — el agente diario (que
 * corre en GitHub Actions, sin credenciales de Airtable) llama este
 * endpoint de solo lectura en vez de tenerlas él mismo. No manda correo:
 * solo devuelve los hallazgos, el agente arma el reporte completo. */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const [pagosAtascados, suscripcionesFallidas] = await Promise.all([
    findStuckPendingPagos(),
    findFailedSubscriptions(),
  ]);

  return NextResponse.json({ hallazgos: [...pagosAtascados, ...suscripcionesFallidas] });
}
