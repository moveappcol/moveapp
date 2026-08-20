"use client";

import { useFormStatus } from "react-dom";

function CancelSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full border border-move-coral px-5 py-3 font-heading text-sm font-semibold text-move-coral transition-colors hover:bg-move-coral hover:text-white disabled:opacity-50"
    >
      {pending ? "Cancelando…" : "Cancelar suscripción"}
    </button>
  );
}

export default function CancelSubscriptionButton({ action }: { action: () => Promise<void> }) {
  return (
    <form action={action} className="rounded-2xl border border-move-green/10 bg-white p-6">
      <p className="font-heading text-sm font-semibold text-move-green">¿Ya no quieres seguir?</p>
      <p className="mt-1 font-body text-xs text-move-green/60">
        Un solo clic — no te va a cobrar el siguiente mes. Tus créditos ya comprados siguen
        disponibles hasta que venzan.
      </p>
      <div className="mt-4">
        <CancelSubmitButton />
      </div>
    </form>
  );
}
