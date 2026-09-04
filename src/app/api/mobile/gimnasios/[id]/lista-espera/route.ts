import { NextRequest, NextResponse } from "next/server";
import { getWaitlistStatus, joinWaitlist, leaveWaitlist } from "@/lib/waitlist";
import { requireMobileUser, MobileAuthError, mobileAuthErrorResponse } from "@/lib/mobile-auth";

export async function GET(req: NextRequest) {
  let user;
  try {
    user = await requireMobileUser();
  } catch (err) {
    if (err instanceof MobileAuthError) return mobileAuthErrorResponse();
    throw err;
  }

  const claseId = req.nextUrl.searchParams.get("claseId");
  if (!claseId) {
    return NextResponse.json({ error: "Falta claseId." }, { status: 400 });
  }

  const status = await getWaitlistStatus(claseId, user.email);
  return NextResponse.json(status);
}

export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireMobileUser();
  } catch (err) {
    if (err instanceof MobileAuthError) return mobileAuthErrorResponse();
    throw err;
  }

  const body = await req.json().catch(() => ({}));
  const claseId = body?.claseId as string | undefined;
  if (!claseId) {
    return NextResponse.json({ ok: false, error: "Falta la clase." }, { status: 400 });
  }

  const { posicion } = await joinWaitlist({ claseId, correo: user.email, nombre: user.userName });
  return NextResponse.json({ ok: true, posicion });
}

export async function DELETE(req: NextRequest) {
  let user;
  try {
    user = await requireMobileUser();
  } catch (err) {
    if (err instanceof MobileAuthError) return mobileAuthErrorResponse();
    throw err;
  }

  const claseId = req.nextUrl.searchParams.get("claseId");
  if (!claseId) {
    return NextResponse.json({ error: "Falta claseId." }, { status: 400 });
  }

  await leaveWaitlist(claseId, user.email);
  return NextResponse.json({ ok: true });
}
