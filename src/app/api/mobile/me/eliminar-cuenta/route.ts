import { NextResponse } from "next/server";
import { requireMobileUser, MobileAuthError, mobileAuthErrorResponse } from "@/lib/mobile-auth";
import { cancelSubscription } from "@/lib/subscriptions";
import { deleteUserAccount } from "@/lib/users";

export async function POST() {
  let user;
  try {
    user = await requireMobileUser();
  } catch (err) {
    if (err instanceof MobileAuthError) return mobileAuthErrorResponse();
    throw err;
  }

  await cancelSubscription(user.email).catch(() => {});

  try {
    await deleteUserAccount(user.userId, user.email);
  } catch {
    return NextResponse.json(
      { ok: false, error: "No pudimos eliminar tu cuenta. Intenta de nuevo o escríbenos a gerencia@uniqueappcol.com." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
