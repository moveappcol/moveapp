import { NextResponse } from "next/server";
import { submitRating } from "@/lib/reservations";
import { requireMobileUser, MobileAuthError, mobileAuthErrorResponse } from "@/lib/mobile-auth";

export async function POST(
  req: Request,
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
  const body = await req.json().catch(() => ({}));
  const calificacion = Number(body?.calificacion);
  const comentario = String(body?.comentario ?? "").trim();

  const result = await submitRating({ reservationId, userEmail: user.email, calificacion, comentario });

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
