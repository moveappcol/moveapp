import { NextRequest, NextResponse } from "next/server";
import { getWaitlistStatus, joinWaitlist, leaveWaitlist } from "@/lib/waitlist";
import { requireMobileUser, MobileAuthError, mobileAuthErrorResponse } from "@/lib/mobile-auth";
import { getActiveReservationClaseIds, validarEntradaListaEspera } from "@/lib/reservations";
import { getClaseById, precioEfectivo } from "@/lib/classes";

export async function GET(req: NextRequest) {
  let user;
  try {
    user = await requireMobileUser();
  } catch (err) {
    if (err instanceof MobileAuthError) return mobileAuthErrorResponse();
    throw err;
  }

  const claseId = req.nextUrl.searchParams.get("claseId");
  if (!claseId) {
    return NextResponse.json({ error: "Falta claseId." }, { status: 400 });
  }

  const status = await getWaitlistStatus(claseId, user.email);
  return NextResponse.json(status);
}

export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireMobileUser();
  } catch (err) {
    if (err instanceof MobileAuthError) return mobileAuthErrorResponse();
    throw err;
  }

  const body = await req.json().catch(() => ({}));
  const claseId = body?.claseId as string | undefined;
  if (!claseId) {
    return NextResponse.json({ ok: false, error: "Falta la clase." }, { status: 400 });
  }

  const clase = await getClaseById(claseId);
  if (!clase) {
    return NextResponse.json({ ok: false, error: "Esta clase ya no está disponible." }, { status: 404 });
  }

  // Mismos requisitos que reservar directo (créditos, cédula, género, plan
  // para Experiencias) — si no, nunca se podría concretar la reserva al
  // tocarle el turno.
  const elegible = await validarEntradaListaEspera({
    userEmail: user.email,
    gimnasioId: clase.gimnasioId ?? "",
    claseCredits: precioEfectivo(clase),
  });
  if (!elegible.ok) {
    return NextResponse.json(elegible, { status: 400 });
  }

  const yaReservada = (await getActiveReservationClaseIds(user.email)).has(claseId);
  if (yaReservada) {
    return NextResponse.json(
      { ok: false, error: "Ya tienes una reserva activa para esta clase — no necesitas la lista de espera." },
      { status: 400 }
    );
  }

  const { posicion } = await joinWaitlist({ claseId, correo: user.email, nombre: user.userName });
  return NextResponse.json({ ok: true, posicion });
}

export async function DELETE(req: NextRequest) {
  let user;
  try {
    user = await requireMobileUser();
  } catch (err) {
    if (err instanceof MobileAuthError) return mobileAuthErrorResponse();
    throw err;
  }

  const claseId = req.nextUrl.searchParams.get("claseId");
  if (!claseId) {
    return NextResponse.json({ error: "Falta claseId." }, { status: 400 });
  }

  await leaveWaitlist(claseId, user.email);
  return NextResponse.json({ ok: true });
}
