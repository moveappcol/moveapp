import { clerkMiddleware } from "@clerk/nextjs/server";

// Next.js 16 renombró "middleware" a "proxy" (mismo mecanismo, nuevo nombre
// de archivo/función). Sin este archivo, auth()/currentUser() de Clerk
// fallan en cualquier server component o route handler — Clerk necesita
// que este proxy corra antes para poder leer la sesión.
export default clerkMiddleware();

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
