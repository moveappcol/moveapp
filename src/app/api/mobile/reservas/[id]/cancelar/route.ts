import { NextResponse } from "next/server";
import { cancelReservation } from "@/lib/reservations";
import { requireMobileUser, MobileAuthError, mobileAuthErrorResponse } from "@/lib/mobile-auth";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let user;
  try {
    user = await requireMobileUser();
  } catch (err) {
    if (err instanceof MobileAuthError) return mobileAuthErrorResponse();
    throw err;
  }

  const { id: reservationId } = await params;
  const result = await cancelReservation({ reservationId, userEmail: user.email });

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
