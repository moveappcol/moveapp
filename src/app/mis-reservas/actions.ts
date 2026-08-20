"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { cancelReservation, submitRating, type CancelResult, type RatingResult } from "@/lib/reservations";

export async function cancelReservationAction(
  reservationId: string,
  _prevState: CancelResult | null
): Promise<CancelResult> {
  const { userId } = await auth();
  if (!userId) {
    return { ok: false, error: "Debes iniciar sesión." };
  }

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  if (!email) {
    return { ok: false, error: "Tu cuenta no tiene un correo asociado." };
  }

  const result = await cancelReservation({ reservationId, userEmail: email });

  if (result.ok) {
    revalidatePath("/mis-reservas");
  }

  return result;
}

export async function submitRatingAction(
  _prevState: RatingResult | null,
  formData: FormData
): Promise<RatingResult> {
  const { userId } = await auth();
  if (!userId) {
    return { ok: false, error: "Debes iniciar sesión." };
  }

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  if (!email) {
    return { ok: false, error: "Tu cuenta no tiene un correo asociado." };
  }

  const reservationId = String(formData.get("reservationId") ?? "");
  const calificacion = Number(formData.get("calificacion"));
  const comentario = String(formData.get("comentario") ?? "").trim();

  const result = await submitRating({ reservationId, userEmail: email, calificacion, comentario });

  if (result.ok) {
    revalidatePath("/mis-reservas");
  }

  return result;
}
