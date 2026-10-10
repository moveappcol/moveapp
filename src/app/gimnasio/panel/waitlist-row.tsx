"use client";

import { useActionState } from "react";
import { aprobarListaEspera, negarListaEspera } from "./actions";
import type { UpdateCuposResult } from "@/lib/classes";

export default function WaitlistRow({
  claseId,
  entryId,
  nombre,
  correo,
}: {
  claseId: string;
  entryId: string;
  nombre: string;
  correo: string;
}) {
  const [state, formAction, isPending] = useActionState<UpdateCuposResult | null, FormData>(
    async (_prevState, formData) => {
      const accion = formData.get("accion");
      return accion === "aprobar"
        ? aprobarListaEspera(claseId, entryId, correo, nombre)
        : negarListaEspera(claseId, entryId);
    },
    null
  );

  return (
    <li className="flex flex-wrap items-center justify-between gap-2">
      <span className="font-body text-sm text-move-green/80">{nombre}</span>
      <form action={formAction} className="flex items-center gap-2">
        <button
          type="submit"
          name="accion"
          value="aprobar"
          disabled={isPending}
          className="rounded-full bg-move-green px-3 py-1 font-heading text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          Permitir ingreso
        </button>
        <button
          type="submit"
          name="accion"
          value="negar"
          disabled={isPending}
          className="rounded-full border border-move-coral px-3 py-1 font-heading text-xs font-semibold text-move-coral transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          Negar
        </button>
        {state?.ok === false && <span className="font-body text-xs text-move-coral">{state.error}</span>}
        {state?.ok === true && (
          <span className="font-body text-xs font-semibold text-emerald-600">Listo ✓</span>
        )}
      </form>
    </li>
  );
}
