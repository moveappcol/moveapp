import { NextRequest, NextResponse } from "next/server";
import { promoverListasDeEsperaConCupo } from "@/lib/reservations";
import { sendOpsAlertEmail } from "@/lib/email";

const OWNER_EMAIL = "uniqueappcol@gmail.com";

/** Corre cada varios minutos: revisa si alguna clase con lista de espera ya
 * tiene cupo disponible (ej. porque el dueño subió "Cupos totales" a mano
 * en Airtable, que por sí solo no avisa a nadie) y promueve a quien
 * corresponda — reserva + descuento de créditos + correo, igual que una
 * promoción disparada por una cancelación desde la app. */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const { promovidos } = await promoverListasDeEsperaConCupo();
    return NextResponse.json({ promovidos });
  } catch (err) {
    const detalle = err instanceof Error ? err.message : String(err);
    await sendOpsAlertEmail({
      ownerEmail: OWNER_EMAIL,
      asunto: "Falló el cron de lista de espera",
      detalle: `No se pudo revisar/promover la lista de espera:\n\n${detalle}`,
    });
    return NextResponse.json({ error: detalle }, { status: 500 });
  }
}
