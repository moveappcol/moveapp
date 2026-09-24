import { cookies, headers } from "next/headers";

export type MetaRequestContext = {
  /** Cookie "_fbp" — la pone el pixel de Meta en el navegador de cualquier
   * visitante, identifica el dispositivo/navegador. */
  fbp: string | null;
  /** Cookie "_fbc" — la pone el pixel solo cuando la persona llegó desde un
   * anuncio (venía con "fbclid" en la URL). Es el dato que más sube la
   * calidad del match según el Administrador de eventos de Meta. */
  fbc: string | null;
  clientIpAddress: string | null;
  clientUserAgent: string | null;
};

/** Lee del request del navegador lo que hace falta para mandar un evento de
 * Conversions API con buena calidad de match — solo funciona llamado desde
 * un Server Component o Server Action real (no desde un webhook ni un cron,
 * ahí no hay cookies/headers de la persona). */
export async function getMetaRequestContext(): Promise<MetaRequestContext> {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  const forwardedFor = headerStore.get("x-forwarded-for");
  return {
    fbp: cookieStore.get("_fbp")?.value ?? null,
    fbc: cookieStore.get("_fbc")?.value ?? null,
    clientIpAddress: forwardedFor ? forwardedFor.split(",")[0].trim() : null,
    clientUserAgent: headerStore.get("user-agent"),
  };
}
