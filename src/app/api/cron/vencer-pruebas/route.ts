import { NextRequest, NextResponse } from "next/server";
import { expirarCreditosDePruebasVencidas } from "@/lib/pruebas";
import { sendOpsAlertEmail } from "@/lib/email";

const OWNER_EMAIL = "gerencia@uniqueappcol.com";

/** Corre 1 vez al día: a las pruebas canceladas que ya llegaron a su
 * FechaFin (conservaron créditos y acceso hasta ahí, como se les prometió)
 * les resta lo que les quede del saldo compartido. Mismo patrón que
 * api/cron/referidos-vencidos. */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { procesados, fallos } = await expirarCreditosDePruebasVencidas();

  if (fallos.length > 0) {
    await sendOpsAlertEmail({
      ownerEmail: OWNER_EMAIL,
      asunto: "No se pudieron vencer los créditos de algunas pruebas canceladas",
      detalle: `No se pudo quitarle los créditos vencidos a estas personas:\n\n${fallos.join("\n")}\n\nSe reintenta mañana automáticamente.`,
    });
  }

  return NextResponse.json({ procesados, fallos });
}
