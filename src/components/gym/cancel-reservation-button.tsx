"use client";

import { useActionState } from "react";
import { cancelReservationAction } from "@/app/mis-reservas/actions";
import type { CancelResult } from "@/lib/reservations";

export default function CancelReservationButton({
  reservationId,
}: {
  reservationId: string;
}) {
  const action = cancelReservationAction.bind(null, reservationId);
  const [state, formAction, isPending] = useActionState<CancelResult | null, FormData>(
    action,
    null
  );

  if (state?.ok) {
    return (
      <p className="font-body text-sm text-move-green/70">
        Cancelada{state.refunded ? " — créditos devueltos." : ", sin devolución (menos de 24h)."}
      </p>
    );
  }

  return (
    <form action={formAction}>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-full border border-move-coral px-4 py-2 font-heading text-xs font-semibold text-move-coral transition-opacity hover:opacity-80 disabled:opacity-50"
      >
        {isPending ? "Cancelando…" : "Cancelar reserva"}
      </button>
      {state && !state.ok && (
        <p className="mt-2 font-body text-xs text-move-coral">{state.error}</p>
      )}
    </form>
  );
}
