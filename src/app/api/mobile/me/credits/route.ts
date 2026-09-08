import { NextResponse } from "next/server";
import { getUserCreditsByEmail } from "@/lib/users";
import { requireMobileUser, mobileAuthErrorResponse } from "@/lib/mobile-auth";

export async function GET() {
  let user;
  try {
    user = await requireMobileUser();
  } catch {
    return mobileAuthErrorResponse();
  }

  const account = await getUserCreditsByEmail(user.email);
  return NextResponse.json({
    credits: account?.credits ?? 0,
    vencimiento: account?.vencimiento ?? null,
    perfilCompleto: account?.perfilCompleto ?? false,
    nombre: account?.nombre ?? null,
    apellido: account?.apellido ?? null,
    telefono: account?.telefono ?? null,
    tipoDocumento: account?.tipoDocumento ?? null,
    cedula: account?.cedula ?? null,
    fechaNacimiento: account?.fechaNacimiento ?? null,
    genero: account?.genero ?? null,
    terminosAceptados: account?.terminosAceptados ?? false,
    tratamientoDatosAceptado: account?.tratamientoDatosAceptado ?? false,
    marketingAceptado: account?.marketingAceptado ?? false,
  });
}
