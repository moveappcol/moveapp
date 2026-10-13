"use client";

import { useActionState, useEffect } from "react";
import { aprobarListaEspera, negarListaEspera } from "./actions";
import type { UpdateCuposResult } from "@/lib/classes";

export default function WaitlistRow({
  claseId,
  entryId,
  nombre,
  correo,
  onResuelta,
}: {
  claseId: string;
  entryId: string;
  nombre: string;
  correo: string;
  onResuelta: () => void;
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

  // Igual que en EliminarClase: sin esto, la persona aprobada o negada
  // seguía viéndose en la lista de espera hasta el próximo refresco
  // automático (cada 20s), como si el botón no hubiera hecho nada.
  useEffect(() => {
    if (state?.ok === true) onResuelta();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

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
