const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

/** Manda una notificación push vía el servicio de Expo. Nunca lanza — un
 * push fallido (token inválido, usuario sin la app instalada, etc.) no debe
 * romper el flujo principal (reservar, un cron, el webhook de Wompi). */
export async function sendPushNotification(params: {
  to: string | null;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}): Promise<void> {
  if (!params.to) return;

  try {
    await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        to: params.to,
        title: params.title,
        body: params.body,
        data: params.data,
        sound: "default",
      }),
    });
  } catch {
    // silencioso a propósito, ver comentario arriba
  }
}
