import { createHash } from "node:crypto";
import { META_PIXEL_ID } from "./meta-pixel-events";

function hashField(value: string): string {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

/** Manda el evento Purchase también desde el servidor (webhook de Wompi ya
 * confirmado), para que no se pierda si el navegador del comprador bloqueó
 * el pixel (ad blockers, Safari ITP, etc). eventId debe ser el mismo que se
 * manda desde PurchaseTracker (el id de transacción de Wompi) para que Meta
 * deduplique ambos avisos de la misma compra. */
export async function sendMetaPurchaseEvent({
  eventId,
  value,
  email,
}: {
  eventId: string;
  value: number;
  email?: string;
}) {
  const accessToken = process.env.META_CONVERSIONS_API_TOKEN;
  if (!accessToken) return;

  const payload = {
    data: [
      {
        event_name: "Purchase",
        event_time: Math.floor(Date.now() / 1000),
        event_id: eventId,
        action_source: "website",
        user_data: {
          ...(email ? { em: [hashField(email)] } : {}),
        },
        custom_data: { value, currency: "COP" },
      },
    ],
  };

  try {
    await fetch(`https://graph.facebook.com/v21.0/${META_PIXEL_ID}/events?access_token=${accessToken}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    // Best-effort: si falla el aviso a Meta no debe romper la confirmación del pago.
  }
}
