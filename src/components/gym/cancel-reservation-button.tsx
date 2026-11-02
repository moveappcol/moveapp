"use client";

import { useActionState, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cancelReservationAction } from "@/app/mis-reservas/actions";
import type { CancelResult } from "@/lib/reservations";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/locale";

// Mismo valor que CANCELLATION_WINDOW_HOURS en lib/reservations.ts — esa
// es la fuente de verdad real (decide si se devuelven créditos); acá solo
// se usa para decidir si mostrar la advertencia antes de cancelar.
const CANCELLATION_WINDOW_HOURS = 24;

type T = ReturnType<typeof getDictionary>["misReservas"]["cancelar"];

function ConfirmLateCancelModal({
  onCancel,
  onConfirm,
  t,
}: {
  onCancel: () => void;
  onConfirm: () => void;
  t: T;
}) {
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-move-green/45 px-6">
      <div className="w-full max-w-sm rounded-2xl bg-white p-7 text-center shadow-xl">
        <p className="font-heading text-lg font-bold text-move-green">{t.cancelarTardeTitulo}</p>
        <p className="mt-1 font-body text-sm text-move-green/70">{t.cancelarTardeTexto}</p>
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-full border border-move-green/20 px-5 py-2.5 font-heading text-sm font-semibold text-move-green transition-opacity hover:opacity-80"
          >
            {t.noCancelar}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-full bg-move-coral px-5 py-2.5 font-heading text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            {t.siCancelar}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function CancelReservationButton({
  reservationId,
  fechaISO,
  locale,
}: {
  reservationId: string;
  /** Fecha de la clase (no de la reserva) — decide si cancelar ahora cae
   * dentro de las 24h sin devolución, para mostrar la advertencia antes de
   * confirmar. Null = no se sabe la fecha, se cancela directo. */
  fechaISO: string | null;
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
  const [showConfirmTarde, setShowConfirmTarde] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  if (state?.ok) {
    return <p className="font-body text-sm text-move-green/70">{t.cancelada(state.refunded)}</p>;
  }

  function handleClick() {
    const hoursUntilClass = fechaISO
      ? (new Date(fechaISO).getTime() - Date.now()) / (1000 * 60 * 60)
      : Infinity;
    if (hoursUntilClass < CANCELLATION_WINDOW_HOURS) {
      setShowConfirmTarde(true);
      return;
    }
    formRef.current?.requestSubmit();
  }

  return (
    <>
      <form ref={formRef} action={formAction}>
        <button
          type="button"
          disabled={isPending}
          onClick={handleClick}
          className="rounded-full border border-move-coral px-4 py-2 font-heading text-xs font-semibold text-move-coral transition-opacity hover:opacity-80 disabled:opacity-50"
        >
          {isPending ? t.cancelando : t.cancelarReserva}
        </button>
        {state && !state.ok && (
          <p className="mt-2 font-body text-xs text-move-coral">{state.error}</p>
        )}
      </form>
      {showConfirmTarde && (
        <ConfirmLateCancelModal
          onCancel={() => setShowConfirmTarde(false)}
          onConfirm={() => {
            setShowConfirmTarde(false);
            formRef.current?.requestSubmit();
          }}
          t={t}
        />
      )}
    </>
  );
}
