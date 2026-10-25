"use client";

import { useFormStatus } from "react-dom";

function SubmitButton({ labelIdle, labelPending }: { labelIdle: string; labelPending: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full border border-move-coral px-5 py-3 font-heading text-sm font-semibold text-move-coral transition-colors hover:bg-move-coral hover:text-white disabled:opacity-50"
    >
      {pending ? labelPending : labelIdle}
    </button>
  );
}

/** Estado de la Prueba UNIQUE en "Mi suscripción" — cancelar/reactivar es 1
 * clic desde acá (sin tener que escribir a soporte), dentro del máximo de 2
 * que pide el requerimiento. */
export default function TrialStatusCard({
  credits,
  fechaFinLabel,
  cancelada,
  cancelarAction,
  reactivarAction,
}: {
  credits: number;
  fechaFinLabel: string;
  cancelada: boolean;
  cancelarAction: () => Promise<void>;
  reactivarAction: () => Promise<void>;
}) {
  return (
    <div className="rounded-2xl border border-move-green/10 bg-white p-6">
      <p className="font-heading text-lg font-semibold text-move-green">Prueba UNIQUE — 1 semana</p>
      <p className="mt-1 font-body text-sm text-move-green/70">{credits} créditos restantes.</p>
      {cancelada ? (
        <p className="mt-1 font-body text-sm text-move-coral">
          Cancelaste la renovación — tu acceso termina el {fechaFinLabel}, sin ningún cobro después.
        </p>
      ) : (
        <p className="mt-1 font-body text-sm text-move-green/60">
          El {fechaFinLabel} se activa tu plan Starter ($209.900/mes).
        </p>
      )}
      <div className="mt-4">
        <form action={cancelada ? reactivarAction : cancelarAction}>
          <SubmitButton
            labelIdle={cancelada ? "Reactivar renovación" : "Cancelar renovación"}
            labelPending={cancelada ? "Reactivando…" : "Cancelando…"}
          />
        </form>
      </div>
    </div>
  );
}
