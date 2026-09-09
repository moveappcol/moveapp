"use client";

import { useActionState } from "react";
import Link from "next/link";
import { joinWaitlistAction, leaveWaitlistAction } from "@/app/gimnasios/[id]/actions";
import type { JoinWaitlistResult } from "@/lib/waitlist";

export default function WaitlistForm({
  gimnasioId,
  claseId,
  initialEnEspera,
  initialPosicion,
}: {
  gimnasioId: string;
  claseId: string;
  initialEnEspera: boolean;
  initialPosicion: number | null;
}) {
  const joinAction = joinWaitlistAction.bind(null, gimnasioId, claseId);
  const [joinState, joinFormAction, joinPending] = useActionState<JoinWaitlistResult | null, FormData>(
    joinAction,
    null
  );

  const leaveAction = leaveWaitlistAction.bind(null, gimnasioId, claseId);
  const [leaveState, leaveFormAction, leavePending] = useActionState<{ ok: true } | null, FormData>(
    leaveAction,
    null
  );

  const enEspera = leaveState?.ok ? false : joinState?.ok ? true : initialEnEspera;
  const posicion = leaveState?.ok ? null : joinState?.ok ? joinState.posicion : initialPosicion;

  if (enEspera) {
    return (
      <div>
        <p className="font-body text-sm text-move-green/70">
          Estás en la lista de espera{posicion ? ` (posición ${posicion})` : ""} — te avisamos si
          se libera un cupo.
        </p>
        <form action={leaveFormAction} className="mt-2">
          <button
            type="submit"
            disabled={leavePending}
            className="rounded-full border border-move-coral px-5 py-2 font-heading text-sm font-semibold text-move-coral transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {leavePending ? "Saliendo…" : "Salir de la lista"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <form action={joinFormAction} className="flex flex-wrap items-center gap-3">
      <button
        type="submit"
        disabled={joinPending}
        className="rounded-full bg-move-coral px-5 py-2 font-heading text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {joinPending ? "Uniendo…" : "Unirme a la lista de espera"}
      </button>
      {joinState && !joinState.ok && (
        <p className="w-full font-body text-sm text-move-coral">{joinState.error}</p>
      )}
      {joinState && !joinState.ok && joinState.code === "perfil_incompleto" && (
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
