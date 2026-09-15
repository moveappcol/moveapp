import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";

// Toda la página es pública (gimnasios, planes, etc. se pueden ver sin
// cuenta). Cuando lleguemos a compra de créditos / reserva de clases,
// esas rutas puntuales se protegerán aquí con auth.protect().
const withClerk = clerkMiddleware();

// Justo después de un login externo (Google), Clerk a veces necesita un
// paso extra ("handshake") para sincronizar la sesión entre su dominio y
// el nuestro. En algunos intentos, ese paso falla de forma transitoria y
// clerkMiddleware() lanza "Clerk: handshake status without redirect" en
// vez de redirigir — sin esto, la excepción tumbaba todo el proxy para
// esa petición, dejando la página sin la sesión (aunque el login sí
// había funcionado del lado de Clerk). Se reintenta una sola vez con la
// misma URL; casi siempre alcanza porque la condición es momentánea.
const HANDSHAKE_RETRY_PARAM = "_authretry";

/** La app móvil se autentica solo con Bearer token — nunca con cookies.
 * El middleware de Clerk corre en /api/mobile también (si no, auth() no
 * funciona ahí), pero por dentro puede mandar cookies de corta duración
 * pensadas para navegación de navegador (detección de bucles de
 * "handshake"). Apple Review detectó que esas cookies persistían en el
 * cliente de la app después de negar el permiso de App Tracking
 * Transparency, así que se quitan de toda respuesta a /api/mobile — la
 * app nunca las necesita para nada. */
export default async function proxy(req: NextRequest, event: NextFetchEvent) {
  let res;
  try {
    res = await withClerk(req, event);
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    const isHandshakeGlitch = message.includes("handshake status without redirect");
    const alreadyRetried = req.nextUrl.searchParams.has(HANDSHAKE_RETRY_PARAM);
    if (isHandshakeGlitch && !alreadyRetried) {
      console.error("[proxy] Clerk handshake glitch, reintentando una vez:", req.nextUrl.pathname);
      const retryUrl = new URL(req.url);
      retryUrl.searchParams.set(HANDSHAKE_RETRY_PARAM, "1");
      return NextResponse.redirect(retryUrl);
    }
    throw err;
  }

  if (res && req.nextUrl.pathname.startsWith("/api/mobile")) {
    res.headers.delete("set-cookie");
  }
  return res;
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
