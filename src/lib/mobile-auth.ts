import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export class MobileAuthError extends Error {}

/** Autenticación para endpoints de /api/mobile/*. Funciona tanto con la
 * cookie de sesión del navegador como con un header "Authorization: Bearer
 * <token>" (el que manda la app con getToken() de Clerk Expo) — auth() de
 * Clerk verifica ambos de la misma forma. */
export async function requireMobileUser(): Promise<{ userId: string; email: string }> {
  const { userId } = await auth();
  if (!userId) throw new MobileAuthError("No autenticado");

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  if (!email) throw new MobileAuthError("La cuenta no tiene correo asociado");

  return { userId, email };
}

export function mobileAuthErrorResponse() {
  return NextResponse.json({ error: "No autenticado" }, { status: 401 });
}
