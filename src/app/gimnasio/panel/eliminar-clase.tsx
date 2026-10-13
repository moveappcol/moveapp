"use client";

import { useActionState, useEffect } from "react";
import { eliminarClasePanel } from "./actions";
import type { EliminarClaseResult } from "@/lib/classes";

export default function EliminarClase({
  claseId,
  onEliminada,
}: {
  claseId: string;
  onEliminada: () => void;
}) {
  const [state, formAction, isPending] = useActionState<EliminarClaseResult | null, FormData>(
    () => eliminarClasePanel(claseId),
    null
  );

  // El panel guarda la lista de clases en memoria y normalmente solo se
  // refresca sola cada 20s (ver POLL_MS en panel-live.tsx) — sin esto, la
  // clase recién borrada seguía viéndose en pantalla hasta el próximo
  // refresco, como si no se hubiera borrado de verdad.
  useEffect(() => {
    if (state?.ok === true) onEliminada();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="flex items-center gap-2">
      <button
        type="submit"
        disabled={isPending}
        className="font-heading text-xs font-semibold text-move-coral/70 transition-colors hover:text-move-coral disabled:opacity-50"
      >
        {isPending ? "..." : "Eliminar"}
      </button>
      {state?.ok === false && <span className="font-body text-xs text-move-coral">{state.error}</span>}
    </form>
  );
}
