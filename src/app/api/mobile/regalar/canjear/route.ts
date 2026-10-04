import { NextResponse } from "next/server";
import { canjearRegalo } from "@/lib/regalos";
import { requireMobileUser, MobileAuthError, mobileAuthErrorResponse } from "@/lib/mobile-auth";

/** Canjea un código de regalo desde la app — a diferencia de la web (donde
 * cualquiera escribe el correo que quiera, sin cuenta), acá siempre se
 * canjea directo a la cuenta logueada: más simple y evita que alguien
 * canjee por accidente a un correo que no es el suyo dentro de su propia
 * sesión de la app. */
export async function POST(req: Request) {
  let user;
  try {
    user = await requireMobileUser();
  } catch (err) {
    if (err instanceof MobileAuthError) return mobileAuthErrorResponse();
    throw err;
  }

  const body = await req.json().catch(() => ({}));
  const codigo = body?.codigo as string | undefined;
  if (!codigo) {
    return NextResponse.json({ ok: false, error: "Escribe el código del regalo." }, { status: 400 });
  }

  const result = await canjearRegalo(codigo, user.email);
  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }
  return NextResponse.json(result);
}
