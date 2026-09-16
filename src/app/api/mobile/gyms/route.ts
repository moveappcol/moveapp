import { NextResponse } from "next/server";
import { getGyms, filterGymsByGenero, GYMS_COMING_SOON } from "@/lib/gyms";
import { requireMobileUser } from "@/lib/mobile-auth";
import { getUserCreditsByEmail } from "@/lib/users";

export async function GET() {
  if (GYMS_COMING_SOON && process.env.NODE_ENV !== "development") {
    return NextResponse.json({ comingSoon: true, gyms: [] });
  }

  const { gyms: allGyms, usingMockData } = await getGyms();

  // Explorar gimnasios no requiere cuenta — sin sesión se ven todos, sin
  // restringir por género.
  let userGenero: string | null = null;
  try {
    const user = await requireMobileUser();
    const account = await getUserCreditsByEmail(user.email);
    userGenero = account?.genero ?? null;
  } catch {
    // sin sesión
  }

  const gyms = filterGymsByGenero(allGyms, userGenero);
  return NextResponse.json({ comingSoon: false, gyms, usingMockData });
}
