import { NextRequest, NextResponse } from "next/server";
import { entregarMesesDeRegalos } from "@/lib/regalos";
import { sendOpsAlertEmail } from "@/lib/email";

const OWNER_EMAIL = "gerencia@uniqueappcol.com";

/** Corre 1 vez al día: a quien canjeó una tarjeta de regalo de 2 o 3 meses
 * le entrega los créditos del mes que le toca (ver entregarMesesDeRegalos). */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { entregados, fallidos } = await entregarMesesDeRegalos();

  if (fallidos.length > 0) {
    await sendOpsAlertEmail({
      ownerEmail: OWNER_EMAIL,
      asunto: "No se pudo entregar el mes de algunas tarjetas de regalo",
      detalle: `Estas tarjetas de regalo no recibieron los créditos del mes:\n\n${fallidos.join("\n")}\n\nSi el contador ya avanzó, hay que darle los créditos a mano.`,
    });
  }

  return NextResponse.json({ entregados, fallidos });
}
