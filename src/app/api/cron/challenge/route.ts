import { NextRequest, NextResponse } from "next/server";
import { correrCronChallenge } from "@/lib/challenge";
import { sendOpsAlertEmail } from "@/lib/email";

const OWNER_EMAIL = "gerencia@uniqueappcol.com";

/** Corre 1 vez al día: avanza, completa o reinicia el Challenge de cada
 * persona, manda los avisos de avance (máx. 1 al día) y vence o avisa los
 * pases de clase gratis (ver correrCronChallenge). */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const resultado = await correrCronChallenge();
  if (resultado.fallidos.length > 0) {
    await sendOpsAlertEmail({
      ownerEmail: OWNER_EMAIL,
      asunto: "El cron del Challenge tuvo errores",
      detalle: `No se pudo procesar a estas personas o pases:\n\n${resultado.fallidos.join("\n")}\n\nSe reintenta mañana automáticamente.`,
    }).catch(() => {});
  }
  return NextResponse.json(resultado);
}
