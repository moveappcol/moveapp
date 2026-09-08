import { NextResponse } from "next/server";
import { saveTrackingConsent } from "@/lib/users";
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
  const granted = Boolean(body?.granted);

  await saveTrackingConsent(user.email, granted);
  return NextResponse.json({ ok: true });
}
