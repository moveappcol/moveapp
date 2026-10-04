import { NextResponse } from "next/server";
import { validarCodigoReferido } from "@/lib/referidos";
import { requireMobileUser, MobileAuthError, mobileAuthErrorResponse } from "@/lib/mobile-auth";

/** Equivalente móvil de checkCodigoReferido (actions.ts de la web) — valida
 * el código ANTES de cobrar, para que la persona vea si lo escribió bien.
 * No otorga nada todavía, eso solo pasa después del pago (ver
 * procesarReferido, llamado desde chargeSubscriptionPlan). */
export async function POST(req: Request) {
  let user;
  try {
    user = await requireMobileUser();
  } catch (err) {
    if (err instanceof MobileAuthError) return mobileAuthErrorResponse();
    throw err;
  }

  const body = await req.json().catch(() => ({}));
  const code = body?.code as string | undefined;
  if (!code) return NextResponse.json({ ok: false, error: "Escribe un código." });

  const result = await validarCodigoReferido(code, user.email);
  return NextResponse.json(result);
}
