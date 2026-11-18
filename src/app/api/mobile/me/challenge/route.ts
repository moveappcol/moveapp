import { NextResponse } from "next/server";
import { evaluarChallenge } from "@/lib/challenge";
import { requireMobileUser, mobileAuthErrorResponse } from "@/lib/mobile-auth";

/** Estado del Challenge UNIQUE de la persona (retos, progreso, pase de
 * clase gratis). Evaluarlo acá también lo hace avanzar: si ya llenó los 4
 * retos, gana su pase apenas abre el perfil, sin esperar al cron. */
export async function GET() {
  let user;
  try {
    user = await requireMobileUser();
  } catch {
    return mobileAuthErrorResponse();
  }
  return NextResponse.json(await evaluarChallenge(user.email));
}
