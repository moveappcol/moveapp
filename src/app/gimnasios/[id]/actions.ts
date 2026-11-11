"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { getClaseById, precioEfectivo } from "@/lib/classes";
import {
  createReservation,
  getActiveReservationClaseIds,
  validarEntradaListaEspera,
  type BookingResult,
} from "@/lib/reservations";
import { joinWaitlist, leaveWaitlist, type JoinWaitlistResult } from "@/lib/waitlist";

export async function bookClass(
  gimnasioId: string,
  claseId: string,
  _prevState: BookingResult | null,
  formData: FormData
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
  if (clase.proximamente) {
    return { ok: false, error: "Esta clase todavía no se puede reservar." };
  }

  const userName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") || email;

  const molestias = String(formData.get("molestias") ?? "").trim();

  const result = await createReservation({
    userEmail: email,
    userName,
    claseId,
    gimnasioId,
    claseCredits: precioEfectivo(clase),
    fechaISO: clase.fecha,
    molestias: molestias || undefined,
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

  const clase = await getClaseById(claseId);
  if (!clase) {
    return { ok: false, error: "Esta clase ya no está disponible." };
  }

  // Mismos requisitos que reservar directo (créditos, cédula, género, plan
  // para Experiencias) — si no, nunca se podría concretar la reserva al
  // tocarle el turno.
  const elegible = await validarEntradaListaEspera({
    userEmail: email,
    gimnasioId,
    claseCredits: precioEfectivo(clase),
  });
  if (!elegible.ok) return elegible;

  const yaReservada = (await getActiveReservationClaseIds(email)).has(claseId);
  if (yaReservada) {
    return {
      ok: false,
      error: "Ya tienes una reserva activa para esta clase — no necesitas la lista de espera.",
      code: "ya_reservada",
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
