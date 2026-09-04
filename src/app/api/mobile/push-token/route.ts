import { NextResponse } from "next/server";
import { savePushToken } from "@/lib/users";
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
  const token = (body?.token as string | undefined) ?? null;

  await savePushToken(user.email, token);
  return NextResponse.json({ ok: true });
}
