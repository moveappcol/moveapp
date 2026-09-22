"use client";

import { useFormStatus } from "react-dom";
import type { Dictionary } from "@/lib/i18n/dictionaries";

type T = Dictionary["miSuscripcion"]["cancel"];

function CancelSubmitButton({ t }: { t: T }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full border border-move-coral px-5 py-3 font-heading text-sm font-semibold text-move-coral transition-colors hover:bg-move-coral hover:text-white disabled:opacity-50"
    >
      {pending ? t.cancelando : t.cancelarSuscripcion}
    </button>
  );
}

export default function CancelSubscriptionButton({
  action,
  t,
}: {
  action: () => Promise<void>;
  t: T;
}) {
  return (
    <form action={action} className="rounded-2xl border border-move-green/10 bg-white p-6">
      <p className="font-heading text-sm font-semibold text-move-green">{t.title}</p>
      <p className="mt-1 font-body text-xs text-move-green/60">{t.body}</p>
      <div className="mt-4">
        <CancelSubmitButton t={t} />
      </div>
    </form>
  );
}
