import { NextResponse } from "next/server";
import { getOrCreateCodigoReferido, CREDITOS_POR_REFERIDO } from "@/lib/referidos";
import { requireMobileUser, mobileAuthErrorResponse } from "@/lib/mobile-auth";

export async function GET() {
  let user;
  try {
    user = await requireMobileUser();
  } catch {
    return mobileAuthErrorResponse();
  }

  const info = await getOrCreateCodigoReferido(user.email);
  if (!info) {
    return NextResponse.json({ codigo: null, esInfluencer: false, creditosPorReferido: CREDITOS_POR_REFERIDO });
  }

  return NextResponse.json({
    codigo: info.codigo,
    esInfluencer: info.esInfluencer,
    creditosPorReferido: CREDITOS_POR_REFERIDO,
  });
}
