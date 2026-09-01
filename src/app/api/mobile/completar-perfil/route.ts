import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { completeProfile } from "@/lib/users";
import {
  isTipoDocumento,
  isGenero,
  validateDocumentNumber,
  validatePhone,
  validateFechaNacimiento,
} from "@/lib/documento";
import { requireMobileUser, MobileAuthError, mobileAuthErrorResponse } from "@/lib/mobile-auth";

export async function POST(req: Request) {
  let user;
  try {
    user = await requireMobileUser();
  } catch (err) {
    if (err instanceof MobileAuthError) return mobileAuthErrorResponse();
    throw err;
  }

  const body = await req.json().catch(() => ({}));

  const nombre = String(body?.nombre ?? "").trim();
  const apellido = String(body?.apellido ?? "").trim();
  const telefono = String(body?.telefono ?? "").trim();
  const tipoDocumento = String(body?.tipoDocumento ?? "").trim();
  const cedula = String(body?.cedula ?? "").trim();
  const fechaNacimiento = String(body?.fechaNacimiento ?? "").trim();
  const genero = String(body?.genero ?? "").trim();
  const terminosAceptados = body?.terminosAceptados === true;
  const tratamientoDatosAceptado = body?.tratamientoDatosAceptado === true;
  const marketingAceptado = body?.marketingAceptado === true;

  if (!nombre) return NextResponse.json({ ok: false, error: "Ingresa tu nombre." }, { status: 400 });
  if (!apellido) return NextResponse.json({ ok: false, error: "Ingresa tu apellido." }, { status: 400 });

  const phoneError = validatePhone(telefono);
  if (phoneError) return NextResponse.json({ ok: false, error: phoneError }, { status: 400 });

  if (!isTipoDocumento(tipoDocumento)) {
    return NextResponse.json({ ok: false, error: "Selecciona un tipo de documento válido." }, { status: 400 });
  }

  const documentError = validateDocumentNumber(tipoDocumento, cedula);
  if (documentError) return NextResponse.json({ ok: false, error: documentError }, { status: 400 });

  const fechaNacimientoError = validateFechaNacimiento(fechaNacimiento);
  if (fechaNacimientoError) {
    return NextResponse.json({ ok: false, error: fechaNacimientoError }, { status: 400 });
  }

  if (!isGenero(genero)) {
    return NextResponse.json({ ok: false, error: "Selecciona tu género." }, { status: 400 });
  }

  if (!terminosAceptados) {
    return NextResponse.json(
      { ok: false, error: "Debes aceptar los términos y condiciones para continuar." },
      { status: 400 }
    );
  }
  if (!tratamientoDatosAceptado) {
    return NextResponse.json(
      { ok: false, error: "Debes aceptar el tratamiento de datos personales para continuar." },
      { status: 400 }
    );
  }

  const clerk = await clerkClient();
  await clerk.users.updateUser(user.userId, { firstName: nombre, lastName: apellido });

  await completeProfile({
    email: user.email,
    nombre,
    apellido,
    telefono,
    tipoDocumento,
    cedula,
    fechaNacimiento,
    genero,
    terminosAceptados,
    tratamientoDatosAceptado,
    marketingAceptado,
  });

  return NextResponse.json({ ok: true });
}
