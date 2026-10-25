import { NextResponse } from "next/server";
import { cancelarPrueba, getPruebaActivaByEmail } from "@/lib/pruebas";
import { sendTrialCancelledEmail } from "@/lib/email";
import { requireMobileUser, MobileAuthError, mobileAuthErrorResponse } from "@/lib/mobile-auth";

export async function POST() {
  let user;
  try {
    user = await requireMobileUser();
  } catch (err) {
    if (err instanceof MobileAuthError) return mobileAuthErrorResponse();
    throw err;
  }

  const prueba = await getPruebaActivaByEmail(user.email);
  const cancelada = await cancelarPrueba(user.email);
  if (cancelada && prueba) {
    await sendTrialCancelledEmail({ correo: user.email, fechaFin: prueba.fechaFin }).catch(() => {});
  }
  return NextResponse.json({ ok: cancelada });
}
