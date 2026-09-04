import { NextRequest, NextResponse } from "next/server";
import { sendAgentReportEmail } from "@/lib/email";

const OWNER_EMAIL = "uniqueappcol@gmail.com";

/** Recibe el reporte del agente diario de salud (corre en GitHub Actions,
 * no en este servidor) y lo manda por correo. No hace ningún chequeo por
 * su cuenta — solo transporta lo que el agente ya encontró/arregló. */
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const cuerpo = body?.cuerpo as string | undefined;
  if (!cuerpo) {
    return NextResponse.json({ error: "falta 'cuerpo'" }, { status: 400 });
  }
  const requiereAtencion = Boolean(body?.requiereAtencion);

  await sendAgentReportEmail({ ownerEmail: OWNER_EMAIL, cuerpo, requiereAtencion });
  return NextResponse.json({ ok: true });
}
