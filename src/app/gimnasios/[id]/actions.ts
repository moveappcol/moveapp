"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { getClaseById } from "@/lib/classes";
import { createReservation, type BookingResult } from "@/lib/reservations";

export async function bookClass(
  gimnasioId: string,
  claseId: string,
  _prevState: BookingResult | null,
  _formData: FormData
): Promise<BookingResult> {
  const { userId } = await auth();
  if (!userId) {
    return { ok: false, error: "Debes iniciar sesión para reservar." };
  }

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  if (!email) {
    return { ok: false, error: "Tu cuenta no tiene un correo asociado." };
  }

  const clase = await getClaseById(claseId);
  if (!clase) {
    return { ok: false, error: "Esta clase ya no está disponible." };
  }
  if (!clase.fecha) {
    return { ok: false, error: "Esta clase todavía no tiene fecha confirmada." };
  }
  if (clase.cuposDisponibles <= 0) {
    return { ok: false, error: "Esta clase ya no tiene cupos disponibles." };
  }

  const userName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") || email;

  const result = await createReservation({
    userEmail: email,
    userName,
    claseId,
    gimnasioId,
    claseCredits: clase.credits,
    fechaISO: clase.fecha,
  });

  if (result.ok) {
    revalidatePath(`/gimnasios/${gimnasioId}`);
  }

  return result;
}
