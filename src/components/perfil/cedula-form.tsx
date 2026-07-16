"use client";

import { useActionState } from "react";
import { saveCedula } from "@/app/completar-perfil/actions";

export default function CedulaForm() {
  const [state, formAction, isPending] = useActionState<{ error: string } | null, FormData>(
    saveCedula,
    null
  );

  return (
    <form action={formAction} className="space-y-4">
      <label className="block">
        <span className="font-heading text-sm font-medium text-move-green">
          Número de cédula
        </span>
        <input
          type="text"
          name="cedula"
          required
          inputMode="numeric"
          className="mt-2 w-full rounded-xl border border-move-green/20 px-4 py-3 font-body text-move-green outline-none focus:border-move-coral"
        />
      </label>

      {state?.error && <p className="font-body text-sm text-move-coral">{state.error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-full bg-move-coral px-6 py-3 font-heading text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? "Guardando…" : "Continuar"}
      </button>
    </form>
  );
}
