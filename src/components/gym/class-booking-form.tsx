"use client";

import { useActionState } from "react";
import { bookClass } from "@/app/gimnasios/[id]/actions";
import type { BookingResult } from "@/lib/reservations";

export default function ClassBookingForm({
  gimnasioId,
  claseId,
}: {
  gimnasioId: string;
  claseId: string;
}) {
  const action = bookClass.bind(null, gimnasioId, claseId);
  const [state, formAction, isPending] = useActionState<BookingResult | null, FormData>(
    action,
    null
  );

  if (state?.ok) {
    return (
      <p className="font-body text-sm font-medium text-move-green">
        ¡Reserva confirmada! Créditos restantes: {state.remainingCredits}.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-3">
      <input
        type="datetime-local"
        name="fecha"
        required
        className="rounded-full border border-move-green/20 px-4 py-2 font-body text-sm text-move-green outline-none focus:border-move-coral"
      />
      <button
        type="submit"
        disabled={isPending}
        className="rounded-full bg-move-coral px-5 py-2 font-heading text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? "Reservando…" : "Reservar"}
      </button>
      {state && !state.ok && (
        <p className="w-full font-body text-sm text-move-coral">{state.error}</p>
      )}
    </form>
  );
}
