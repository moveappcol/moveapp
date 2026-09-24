import { NextRequest, NextResponse } from "next/server";
import { LOCALE_COOKIE } from "@/lib/i18n/locale";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/** Solo para links de campañas de anuncios dirigidas a extranjeros: fuerza
 * el idioma inglés (misma cookie que pone el toggle ES/EN del sitio) y
 * redirige a "to" — así el link del anuncio puede caer directo en una
 * sección en inglés sin que la persona tenga que tocar el toggle ella
 * misma. Ej: /idioma/en?to=/%23como-funciona
 *
 * "to" se valida para que solo pueda ser una ruta relativa del propio
 * sitio (nunca una URL completa) — si no, cualquiera podría armar un link
 * de "uniqueappcol.com/idioma/en?to=https://otro-sitio.com" que redirige
 * fuera del sitio. */
function safeRedirectPath(to: string | null): string {
  if (!to || !to.startsWith("/") || to.startsWith("//")) return "/";
  return to;
}

/** req.nextUrl.origin refleja la dirección INTERNA del contenedor detrás
 * del proxy de Railway (ej. "localhost:8080"), no el dominio público real
 * — hay que armar el origen a partir de los headers que sí pone el proxy
 * (confirmado en pruebas, 2026-09-24: sin esto, el redirect apuntaba a
 * localhost y no funcionaba para nadie). */
function resolveOrigin(req: NextRequest): string {
  const forwardedHost = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const forwardedProto = req.headers.get("x-forwarded-proto") ?? "https";
  return forwardedHost ? `${forwardedProto}://${forwardedHost}` : req.nextUrl.origin;
}

export async function GET(req: NextRequest) {
  const to = safeRedirectPath(req.nextUrl.searchParams.get("to"));
  const url = new URL(to, resolveOrigin(req));
  const res = NextResponse.redirect(url);
  res.cookies.set(LOCALE_COOKIE, "en", {
    maxAge: ONE_YEAR_SECONDS,
    sameSite: "lax",
    path: "/",
  });
  return res;
}
