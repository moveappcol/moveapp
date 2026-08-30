import { NextResponse } from "next/server";
import { getUserCreditsByEmail } from "@/lib/users";
import { requireMobileUser, mobileAuthErrorResponse } from "@/lib/mobile-auth";

export async function GET() {
  let user;
  try {
    user = await requireMobileUser();
  } catch {
    return mobileAuthErrorResponse();
  }

  const account = await getUserCreditsByEmail(user.email);
  return NextResponse.json({
    credits: account?.credits ?? 0,
    vencimiento: account?.vencimiento ?? null,
    perfilCompleto: account?.perfilCompleto ?? false,
  });
}
