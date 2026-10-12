"use client";

import { useActionState } from "react";
import { eliminarClasePanel } from "./actions";
import type { EliminarClaseResult } from "@/lib/classes";

export default function EliminarClase({ claseId }: { claseId: string }) {
  const [state, formAction, isPending] = useActionState<EliminarClaseResult | null, FormData>(
    () => eliminarClasePanel(claseId),
    null
  );

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
