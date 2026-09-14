"use client";

import { useActionState } from "react";
import Link from "next/link";
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
      <div className="flex items-center gap-3 rounded-xl border border-move-green/20 bg-move-green/5 px-4 py-3">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-move-green">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-white stroke-[3]">
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <p className="font-body text-sm font-medium text-move-green">
          <span className="font-heading font-bold">Reserva confirmada.</span> Créditos restantes:{" "}
          {state.remainingCredits}.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-3">
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
      {state && !state.ok && state.code === "perfil_incompleto" && (
        <Link
          href="/completar-perfil"
          className="w-full font-heading text-sm font-semibold text-move-coral hover:underline"
        >
          Completar perfil
        </Link>
      )}
    </form>
  );
}
