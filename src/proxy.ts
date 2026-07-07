import { clerkMiddleware } from "@clerk/nextjs/server";

// Toda la página es pública (gimnasios, planes, etc. se pueden ver sin
// cuenta). Cuando lleguemos a compra de créditos / reserva de clases,
// esas rutas puntuales se protegerán aquí con auth.protect().
export default clerkMiddleware();

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
