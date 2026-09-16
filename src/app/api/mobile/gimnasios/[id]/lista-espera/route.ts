import { NextRequest, NextResponse } from "next/server";
import { getWaitlistStatus, joinWaitlist, leaveWaitlist } from "@/lib/waitlist";
import { requireMobileUser, MobileAuthError, mobileAuthErrorResponse } from "@/lib/mobile-auth";
import { getUserCreditsByEmail } from "@/lib/users";
import { getActiveReservationClaseIds } from "@/lib/reservations";
import { getClaseById } from "@/lib/classes";
import { getGymById, canAccessGymByGenero } from "@/lib/gyms";

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

  // Mismo requisito que reservar directo: sin cédula registrada, nunca se
  // podría concretar la reserva si le toca el turno — mejor no dejarla
  // "esperando" un cupo que nunca va a poder tomar.
  const account = await getUserCreditsByEmail(user.email);
  if (!account?.cedula) {
    return NextResponse.json(
      { ok: false, error: "Completa tu perfil (cédula) antes de unirte a la lista de espera." },
      { status: 400 }
    );
  }

  const clase = await getClaseById(claseId);
  const gym = clase?.gimnasioId ? await getGymById(clase.gimnasioId) : null;
  if (gym && !canAccessGymByGenero(gym.genero, account.genero)) {
    return NextResponse.json(
      { ok: false, error: "Este gimnasio no está disponible para tu perfil." },
      { status: 400 }
    );
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
