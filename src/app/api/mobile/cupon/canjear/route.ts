import { NextResponse } from "next/server";
import { redeemFreeCouponForEmail } from "@/lib/cupones";
import { requireMobileUser, MobileAuthError, mobileAuthErrorResponse } from "@/lib/mobile-auth";

/** Equivalente móvil de redeemFreeCoupon (actions.ts de la web) — canjea un
 * cupón de "Créditos gratis" directo a la cuenta logueada, sin pasar por
 * Wompi ni pedir tarjeta. */
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
  if (!code) return NextResponse.json({ ok: false, error: "Escribe un código." }, { status: 400 });

  const result = await redeemFreeCouponForEmail(user.email, code);
  if (!result.ok) return NextResponse.json(result, { status: 400 });
  return NextResponse.json(result);
}
