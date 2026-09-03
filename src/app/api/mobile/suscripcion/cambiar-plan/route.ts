import { NextResponse } from "next/server";
import { scheduleChangePlan } from "@/lib/subscriptions";
import { findCatalogItem } from "@/lib/orders";
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
  const planId = body?.planId as string | undefined;
  if (!planId || !findCatalogItem("plan", planId)) {
    return NextResponse.json({ ok: false, error: "Plan desconocido." }, { status: 400 });
  }

  await scheduleChangePlan(user.email, planId);
  return NextResponse.json({ ok: true });
}
