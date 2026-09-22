"use client";

import { useActionState } from "react";
import { cancelReservationAction } from "@/app/mis-reservas/actions";
import type { CancelResult } from "@/lib/reservations";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/locale";

export default function CancelReservationButton({
  reservationId,
  locale,
}: {
  reservationId: string;
  locale: Locale;
}) {
  // t se calcula acá (no llega como prop) porque cancelada() es una
  // función — ver la misma nota en class-list.tsx.
  const t = getDictionary(locale).misReservas.cancelar;
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
