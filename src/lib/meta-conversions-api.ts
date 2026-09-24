import { createHash } from "node:crypto";
import { META_PIXEL_ID } from "./meta-pixel-events";

function hashField(value: string): string {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

type MetaUserData = {
  email?: string;
  /** Cookie "_fbp" que pone el propio pixel — identifica el navegador. */
  fbp?: string | null;
  /** Cookie "_fbc" que pone el pixel cuando la persona llegó desde un anuncio
   * (trae el fbclid) — es la que más sube la calidad del match según Meta. */
  fbc?: string | null;
  /** Solo tienen sentido cuando el evento se manda EN el mismo request del
   * navegador de la persona (ej. al ver el checkout) — no cuando se manda
   * después desde un webhook server-to-server (ej. la confirmación de pago
   * de Wompi), ahí la IP/user-agent serían los de Wompi, no los del
   * comprador, y ensuciarían el match en vez de ayudarlo. */
  clientIpAddress?: string | null;
  clientUserAgent?: string | null;
};

async function sendMetaCapiEvent(params: {
  eventName: string;
  eventId: string;
  userData: MetaUserData;
  customData?: Record<string, unknown>;
}): Promise<void> {
  const accessToken = process.env.META_CONVERSIONS_API_TOKEN;
  if (!accessToken) return;

  const { email, fbp, fbc, clientIpAddress, clientUserAgent } = params.userData;
  const payload = {
    data: [
      {
        event_name: params.eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: params.eventId,
        action_source: "website",
        user_data: {
          ...(email ? { em: [hashField(email)] } : {}),
          ...(fbp ? { fbp } : {}),
          ...(fbc ? { fbc } : {}),
          ...(clientIpAddress ? { client_ip_address: clientIpAddress } : {}),
          ...(clientUserAgent ? { client_user_agent: clientUserAgent } : {}),
        },
        ...(params.customData ? { custom_data: params.customData } : {}),
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
    // Best-effort: un fallo acá nunca debe romper el flujo real (pago,
    // vista del checkout, etc.) que disparó el evento.
  }
}

/** Manda el evento Purchase también desde el servidor (webhook de Wompi ya
 * confirmado), para que no se pierda si el navegador del comprador bloqueó
 * el pixel (ad blockers, Safari ITP, etc). eventId debe ser el mismo que se
 * manda desde PurchaseTracker (el id de transacción de Wompi) para que Meta
 * deduplique ambos avisos de la misma compra. fbp/fbc vienen del momento en
 * que se creó el pago (ver Pago.fbp/fbc en pagos.ts) — acá, en el webhook,
 * ya no hay navegador del que leerlos directamente. */
export async function sendMetaPurchaseEvent({
  eventId,
  value,
  email,
  fbp,
  fbc,
}: {
  eventId: string;
  value: number;
  email?: string;
  fbp?: string | null;
  fbc?: string | null;
}): Promise<void> {
  await sendMetaCapiEvent({
    eventName: "Purchase",
    eventId,
    userData: { email, fbp, fbc },
    customData: { value, currency: "COP" },
  });
}

/** Manda "InitiateCheckout" también desde el servidor, al mismo tiempo que
 * se renderiza la página de checkout — Meta reporta que combinar pixel +
 * Conversions API para este evento duplica las conversiones registradas
 * (menos pérdida por ad blockers). eventId debe coincidir con el que manda
 * CheckoutViewTracker desde el navegador para que Meta deduplique. Acá sí
 * tiene sentido mandar IP/user-agent: el evento se genera en el mismo
 * request del navegador de la persona. */
export async function sendMetaInitiateCheckoutEvent({
  eventId,
  value,
  contentId,
  contentName,
  email,
  fbp,
  fbc,
  clientIpAddress,
  clientUserAgent,
}: {
  eventId: string;
  value: number;
  contentId: string;
  contentName: string;
  email?: string;
  fbp?: string | null;
  fbc?: string | null;
  clientIpAddress?: string | null;
  clientUserAgent?: string | null;
}): Promise<void> {
  await sendMetaCapiEvent({
    eventName: "InitiateCheckout",
    eventId,
    userData: { email, fbp, fbc, clientIpAddress, clientUserAgent },
    customData: { value, currency: "COP", content_ids: [contentId], content_name: contentName },
  });
}
