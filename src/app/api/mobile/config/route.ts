import { NextResponse } from "next/server";
import { wompiPublicKey, fetchAcceptanceTokens } from "@/lib/wompi";

export async function GET() {
  const tokens = await fetchAcceptanceTokens();
  return NextResponse.json({
    wompiPublicKey: wompiPublicKey(),
    permalinkAcceptance: tokens.permalinkAcceptance,
    permalinkPersonalAuth: tokens.permalinkPersonalAuth,
  });
}
