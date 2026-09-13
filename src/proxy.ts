import { clerkMiddleware } from "@clerk/nextjs/server";
import type { NextFetchEvent, NextRequest } from "next/server";

// Toda la página es pública (gimnasios, planes, etc. se pueden ver sin
// cuenta). Cuando lleguemos a compra de créditos / reserva de clases,
// esas rutas puntuales se protegerán aquí con auth.protect().
const withClerk = clerkMiddleware();

/** La app móvil se autentica solo con Bearer token — nunca con cookies.
 * El middleware de Clerk corre en /api/mobile también (si no, auth() no
 * funciona ahí), pero por dentro puede mandar cookies de corta duración
 * pensadas para navegación de navegador (detección de bucles de
 * "handshake"). Apple Review detectó que esas cookies persistían en el
 * cliente de la app después de negar el permiso de App Tracking
 * Transparency, así que se quitan de toda respuesta a /api/mobile — la
 * app nunca las necesita para nada. */
export default async function proxy(req: NextRequest, event: NextFetchEvent) {
  const res = await withClerk(req, event);
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
