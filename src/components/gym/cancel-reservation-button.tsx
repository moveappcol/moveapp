"use client";

import { useActionState } from "react";
import { cancelReservationAction } from "@/app/mis-reservas/actions";
import type { CancelResult } from "@/lib/reservations";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export default function CancelReservationButton({
  reservationId,
  t,
}: {
  reservationId: string;
  t: Dictionary["misReservas"]["cancelar"];
}) {
  const action = cancelReservationAction.bind(null, reservationId);
  const [state, formAction, isPending] = useActionState<CancelResult | null, FormData>(
    action,
    null
  );

  if (state?.ok) {
    return <p className="font-body text-sm text-move-green/70">{t.cancelada(state.refunded)}</p>;
  }

  return (
    <form action={formAction}>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-full border border-move-coral px-4 py-2 font-heading text-xs font-semibold text-move-coral transition-opacity hover:opacity-80 disabled:opacity-50"
      >
        {isPending ? t.cancelando : t.cancelarReserva}
      </button>
      {state && !state.ok && (
        <p className="mt-2 font-body text-xs text-move-coral">{state.error}</p>
      )}
    </form>
  );
}
