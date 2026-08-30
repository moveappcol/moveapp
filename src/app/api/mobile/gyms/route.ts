import { NextResponse } from "next/server";
import { getGyms, GYMS_COMING_SOON } from "@/lib/gyms";

export async function GET() {
  if (GYMS_COMING_SOON && process.env.NODE_ENV !== "development") {
    return NextResponse.json({ comingSoon: true, gyms: [] });
  }

  const { gyms, usingMockData } = await getGyms();
  return NextResponse.json({ comingSoon: false, gyms, usingMockData });
}
