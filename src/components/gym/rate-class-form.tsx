"use client";

import { useActionState, useState } from "react";
import { submitRatingAction } from "@/app/mis-reservas/actions";
import type { RatingResult } from "@/lib/reservations";

export default function RateClassForm({ reservationId }: { reservationId: string }) {
  const [state, formAction, isPending] = useActionState<RatingResult | null, FormData>(
    submitRatingAction,
    null
  );
  const [calificacion, setCalificacion] = useState(0);
  const [hover, setHover] = useState(0);

  if (state?.ok) {
    return (
      <p className="mt-2 font-body text-sm font-medium text-move-green">
        ¡Gracias por calificar la clase!
      </p>
    );
  }

  return (
    <form action={formAction} className="mt-3 rounded-xl border border-move-green/10 bg-move-green/[0.02] p-4">
      <input type="hidden" name="reservationId" value={reservationId} />
      <input type="hidden" name="calificacion" value={calificacion} />

      <p className="font-heading text-xs font-semibold text-move-green">
        ¿Cómo estuvo la clase? (opcional)
      </p>

      <div className="mt-2 flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setCalificacion(n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            aria-label={`${n} estrella${n > 1 ? "s" : ""}`}
            className="text-2xl leading-none transition-transform hover:scale-110"
          >
            <span className={(hover || calificacion) >= n ? "text-move-coral" : "text-move-green/20"}>
              ★
            </span>
          </button>
        ))}
      </div>

      <textarea
        name="comentario"
        rows={2}
        placeholder="Cuéntanos algo más (opcional)"
        className="mt-3 w-full rounded-xl border border-move-green/20 px-3 py-2 font-body text-sm text-move-green outline-none focus:border-move-coral"
      />

      {state && !state.ok && <p className="mt-2 font-body text-xs text-move-coral">{state.error}</p>}

      <button
        type="submit"
        disabled={isPending || calificacion === 0}
        className="mt-3 rounded-full bg-move-coral px-4 py-2 font-heading text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? "Enviando…" : "Enviar calificación"}
      </button>
    </form>
  );
}
