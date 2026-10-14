"use client";

import { useActionState, useEffect } from "react";
import { actualizarCupos } from "./actions";
import type { UpdateCuposResult } from "@/lib/classes";

export default function CuposEditor({
  claseId,
  cuposActuales,
  onActualizado,
}: {
  claseId: string;
  cuposActuales: number;
  onActualizado: () => void;
}) {
  const action = actualizarCupos.bind(null, claseId);
  const [state, formAction, isPending] = useActionState<UpdateCuposResult | null, FormData>(
    action,
    null
  );

  // Igual que en EliminarClase: sin esto, el resto del panel (inscritos,
  // lista de espera) se quedaba mostrando los datos viejos hasta el
  // próximo refresco automático (cada 20s).
  useEffect(() => {
    if (state?.ok === true) onActualizado();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="flex items-center gap-2">
      <label className="font-body text-xs text-move-green/60">Cupos</label>
      <input
        type="number"
        name="cupos"
        min={0}
        step={1}
        defaultValue={cuposActuales}
        className="w-16 rounded-lg border border-move-green/20 px-2 py-1.5 text-center font-heading text-sm font-semibold text-move-green outline-none focus:border-move-coral"
      />
      <button
        type="submit"
        disabled={isPending}
        className="rounded-full bg-move-green px-3 py-1.5 font-heading text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? "..." : "Guardar"}
      </button>
      {state?.ok === false && (
        <span className="font-body text-xs text-move-coral">{state.error}</span>
      )}
      {state?.ok === true && (
        <span className="font-body text-xs font-semibold text-emerald-600">Guardado ✓</span>
      )}
    </form>
  );
}
