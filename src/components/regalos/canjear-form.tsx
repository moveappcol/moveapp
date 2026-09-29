"use client";

import { useActionState } from "react";
import Link from "next/link";
import { canjearRegaloAction } from "@/app/canjear/actions";
import type { CanjearRegaloResult } from "@/lib/regalos";

export default function CanjearForm({ codigoInicial }: { codigoInicial: string }) {
  const [result, formAction, isSubmitting] = useActionState<CanjearRegaloResult | null, FormData>(
    canjearRegaloAction,
    null
  );

  if (result?.ok) {
    return (
      <div className="rounded-3xl border border-move-green/10 bg-white p-8 text-center">
        <p className="font-heading text-lg font-bold text-move-green">¡Regalo activado! 🎉</p>
        <p className="mt-2 font-body text-sm text-move-green/70">
          Te agregamos {result.credits} créditos. Si todavía no tienes cuenta en UNIQUE, crea una
          con el mismo correo que usaste aquí para verlos.
        </p>
        <Link
          href="/crear-cuenta"
          className="mt-6 inline-block rounded-full bg-move-coral px-6 py-3 font-heading text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          Crear cuenta
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <label className="block">
        <span className="font-heading text-sm font-medium text-move-green">Código del regalo</span>
        <input
          type="text"
          name="codigo"
          required
          defaultValue={codigoInicial}
          placeholder="XXXX-XXXX"
          className="mt-1 w-full rounded-xl border border-move-green/20 px-4 py-3 font-body text-sm uppercase tracking-widest text-move-green outline-none focus:border-move-coral"
        />
      </label>
      <label className="block">
        <span className="font-heading text-sm font-medium text-move-green">
          Correo donde quieres los créditos
        </span>
        <input
          type="email"
          name="correo"
          required
          className="mt-1 w-full rounded-xl border border-move-green/20 px-4 py-3 font-body text-sm text-move-green outline-none focus:border-move-coral"
        />
      </label>

      {result && !result.ok && (
        <p className="font-body text-sm text-move-coral">{result.error}</p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-full bg-move-coral px-6 py-3 font-heading text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {isSubmitting ? "Activando…" : "Activar regalo"}
      </button>
    </form>
  );
}
