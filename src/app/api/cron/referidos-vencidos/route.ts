import { NextRequest, NextResponse } from "next/server";
import { expirarCreditosReferidoVencidos } from "@/lib/referidos";
import { sendOpsAlertEmail } from "@/lib/email";

const OWNER_EMAIL = "uniqueappcol@gmail.com";

/** Corre 1 vez al día: le quita los créditos de referido a quien refirió si
 * pasaron 30 días desde que se los dieron sin que el cron ya los hubiera
 * procesado (ver Reclamado en la tabla "Referidos"). */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { procesados, fallos } = await expirarCreditosReferidoVencidos();

  if (fallos.length > 0) {
    await sendOpsAlertEmail({
      ownerEmail: OWNER_EMAIL,
      asunto: "No se pudieron vencer algunos créditos de referido",
      detalle: `No se pudo quitarle los créditos vencidos a estas personas:\n\n${fallos.join("\n")}\n\nSe reintenta mañana automáticamente.`,
    });
  }

  return NextResponse.json({ procesados, fallos });
}
