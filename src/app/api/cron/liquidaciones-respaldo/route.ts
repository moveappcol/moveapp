import { NextRequest, NextResponse } from "next/server";
import { generarLiquidacionesFaltantes } from "@/lib/classes";
import { sendOpsAlertEmail } from "@/lib/email";

const OWNER_EMAIL = "uniqueappcol@gmail.com";

/** Red de seguridad diaria — ver generarLiquidacionesFaltantes en
 * classes.ts. Corre una vez al día (hora distinta a cualquier otro cron
 * para no competir) y revisa TODO lo que ya debería estar facturado. Si
 * encuentra algo que el cron normal de 24h antes se saltó (por la razón
 * que sea), lo genera y avisa por correo — así nunca hace falta auditar
 * la tabla Liquidacion a mano para saber si algo quedó sin cobrar. */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { creadas } = await generarLiquidacionesFaltantes();

  if (creadas.length > 0) {
    const detalle = creadas
      .map((c) => `${c.gimnasio} — ${c.clase} (${c.fecha}): $${c.total.toLocaleString("es-CO")}`)
      .join("\n");
    const totalGeneral = creadas.reduce((sum, c) => sum + c.total, 0);

    await sendOpsAlertEmail({
      ownerEmail: OWNER_EMAIL,
      asunto: `${creadas.length} liquidación(es) que el cron normal se saltó — ya se generaron solas`,
      detalle: `El cron de 24h antes no generó estas liquidaciones a tiempo (puede ser una falla puntual del servicio en Railway). Este respaldo diario las encontró y las creó automáticamente, con estado "Pendiente":\n\n${detalle}\n\nTotal: $${totalGeneral.toLocaleString("es-CO")}\n\nNo hace falta hacer nada — solo es un aviso para que sepas que pasó.`,
    });
  }

  return NextResponse.json({ ok: true, creadas: creadas.length });
}
