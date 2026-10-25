import { NextResponse } from "next/server";
import { reactivarPrueba } from "@/lib/pruebas";
import { requireMobileUser, MobileAuthError, mobileAuthErrorResponse } from "@/lib/mobile-auth";

export async function POST() {
  let user;
  try {
    user = await requireMobileUser();
  } catch (err) {
    if (err instanceof MobileAuthError) return mobileAuthErrorResponse();
    throw err;
  }

  const reactivada = await reactivarPrueba(user.email);
  return NextResponse.json({ ok: reactivada });
}
