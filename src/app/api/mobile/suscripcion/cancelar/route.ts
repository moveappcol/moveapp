import { NextResponse } from "next/server";
import { cancelSubscription } from "@/lib/subscriptions";
import { requireMobileUser, MobileAuthError, mobileAuthErrorResponse } from "@/lib/mobile-auth";

export async function POST() {
  let user;
  try {
    user = await requireMobileUser();
  } catch (err) {
    if (err instanceof MobileAuthError) return mobileAuthErrorResponse();
    throw err;
  }

  await cancelSubscription(user.email);
  return NextResponse.json({ ok: true });
}
