import { NextRequest, NextResponse } from "next/server";

/** Verificación inicial que hace Meta al guardar la URL del webhook (un GET
 * con hub.mode/hub.verify_token/hub.challenge) — ver
 * https://developers.facebook.com/docs/graph-api/webhooks/getting-started */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && challenge && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: "forbidden" }, { status: 403 });
}

/** Todavía no procesamos respuestas/estados de entrega — solo confirmamos
 * recepción para que Meta no reintente ni desactive el webhook por fallar. */
export async function POST() {
  return NextResponse.json({ ok: true });
}
