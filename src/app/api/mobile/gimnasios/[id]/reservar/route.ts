import { NextResponse } from "next/server";
import { getClaseById, precioEfectivo } from "@/lib/classes";
import { createReservation } from "@/lib/reservations";
import { requireMobileUser, MobileAuthError, mobileAuthErrorResponse } from "@/lib/mobile-auth";
import { getUserCreditsByEmail } from "@/lib/users";
import { sendPushNotification } from "@/lib/push";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let user;
  try {
    user = await requireMobileUser();
  } catch (err) {
    if (err instanceof MobileAuthError) return mobileAuthErrorResponse();
    throw err;
  }

  const { id: gimnasioId } = await params;
  const body = await req.json().catch(() => ({}));
  const claseId = body?.claseId as string | undefined;
  if (!claseId) {
    return NextResponse.json({ ok: false, error: "Falta la clase." }, { status: 400 });
  }

  const clase = await getClaseById(claseId);
  if (!clase) {
    return NextResponse.json({ ok: false, error: "Esta clase ya no está disponible." }, { status: 404 });
  }
  if (!clase.fecha) {
    return NextResponse.json({ ok: false, error: "Esta clase todavía no tiene fecha confirmada." }, { status: 400 });
  }
  if (clase.cuposDisponibles <= 0) {
    return NextResponse.json({ ok: false, error: "Esta clase ya no tiene cupos disponibles." }, { status: 400 });
  }

  const result = await createReservation({
    userEmail: user.email,
    userName: user.userName,
    claseId,
    gimnasioId,
    claseCredits: precioEfectivo(clase),
    fechaISO: clase.fecha,
  });

  if (result.ok) {
    const persona = await getUserCreditsByEmail(user.email);
    await sendPushNotification({
      to: persona?.pushToken ?? null,
      title: "¡Reserva confirmada! 🎉",
      body: `${clase.name} — te esperamos.`,
      data: { type: "reserva-confirmada", claseId },
    });
  }

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
