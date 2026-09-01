import { NextResponse } from "next/server";
import { getGymById, GYMS_COMING_SOON } from "@/lib/gyms";
import { getClassesForGym } from "@/lib/classes";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (GYMS_COMING_SOON && process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "No disponible." }, { status: 404 });
  }

  const { id } = await params;
  const gym = await getGymById(id);
  if (!gym) {
    return NextResponse.json({ error: "Gimnasio no encontrado." }, { status: 404 });
  }

  const classes = await getClassesForGym(id);
  return NextResponse.json({ gym, classes });
}
