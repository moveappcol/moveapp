"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { getClaseById, precioEfectivo } from "@/lib/classes";
import { createReservation, type BookingResult } from "@/lib/reservations";
import { getUserCreditsByEmail } from "@/lib/users";
import { joinWaitlist, leaveWaitlist, type JoinWaitlistResult } from "@/lib/waitlist";

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
    claseCredits: precioEfectivo(clase),
    fechaISO: clase.fecha,
  });

  if (result.ok) {
    revalidatePath(`/gimnasios/${gimnasioId}`);
  }

  return result;
}

export async function joinWaitlistAction(
  gimnasioId: string,
  claseId: string,
  _prevState: JoinWaitlistResult | null,
  _formData: FormData
): Promise<JoinWaitlistResult> {
  const { userId } = await auth();
  if (!userId) {
    return { ok: false, error: "Debes iniciar sesión para unirte a la lista de espera." };
  }

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  if (!email) {
    return { ok: false, error: "Tu cuenta no tiene un correo asociado." };
  }

  // Mismo requisito que reservar directo: sin cédula registrada, nunca se
  // podría concretar la reserva si le toca el turno.
  const account = await getUserCreditsByEmail(email);
  if (!account?.cedula) {
    return {
      ok: false,
      error: "Completa tu perfil (cédula) antes de unirte a la lista de espera.",
      code: "perfil_incompleto",
    };
  }

  const userName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || email;
  const { posicion } = await joinWaitlist({ claseId, correo: email, nombre: userName });
  revalidatePath(`/gimnasios/${gimnasioId}`);
  return { ok: true, posicion };
}

export async function leaveWaitlistAction(
  gimnasioId: string,
  claseId: string,
  _prevState: { ok: true } | null,
  _formData: FormData
): Promise<{ ok: true }> {
  const { userId } = await auth();
  if (userId) {
    const user = await currentUser();
    const email = user?.primaryEmailAddress?.emailAddress;
    if (email) {
      await leaveWaitlist(claseId, email);
      revalidatePath(`/gimnasios/${gimnasioId}`);
    }
  }
  return { ok: true };
}
