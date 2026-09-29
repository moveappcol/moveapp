"use client";

import { useActionState } from "react";
import { enviarRegaloADestinatario, type EnviarRegaloResult } from "@/app/regalar/actions";

export default function VoucherCard({
  codigo,
  planLabel,
  fechaLimiteLabel,
  yaCanjeado,
}: {
  codigo: string;
  planLabel: string;
  fechaLimiteLabel: string;
  yaCanjeado: boolean;
}) {
  const enviarAction = enviarRegaloADestinatario.bind(null, codigo);
  const [result, formAction, isSending] = useActionState<EnviarRegaloResult | null, FormData>(
    async (_prev, formData) => enviarAction(String(formData.get("correo") ?? "")),
    null
  );

  return (
    <div>
      <div className="print:border-0 rounded-3xl border border-move-green/10 bg-white p-8 text-center shadow-sm">
        <p className="font-heading text-xs font-semibold uppercase tracking-wide text-move-green/50">
          Regalo UNIQUE
        </p>
        <p className="mt-4 font-heading text-3xl font-extrabold tracking-widest text-move-coral">
          {codigo}
        </p>
        <p className="mt-4 font-body text-sm text-move-green/70">{planLabel}</p>
        {yaCanjeado ? (
          <p className="mt-2 font-heading text-sm font-semibold text-move-green">
            Este código ya fue canjeado.
          </p>
        ) : (
          <p className="mt-2 font-body text-xs text-move-green/50">
            Válido hasta el {fechaLimiteLabel}
          </p>
        )}
      </div>

      <div className="mt-6 flex gap-3 print:hidden">
        <button
          type="button"
          onClick={() => window.print()}
          className="flex-1 rounded-full border border-move-green/20 px-5 py-3 font-heading text-sm font-medium text-move-green transition-colors hover:border-move-green"
        >
          Imprimir
        </button>
      </div>

      {!yaCanjeado && (
        <form action={formAction} className="mt-6 space-y-3 print:hidden">
          <label className="block">
            <span className="font-heading text-sm font-medium text-move-green">
              O envíaselo directo por correo
            </span>
            <input
              type="email"
              name="correo"
              required
              placeholder="correo@ejemplo.com"
              className="mt-1 w-full rounded-xl border border-move-green/20 px-4 py-3 font-body text-sm text-move-green outline-none focus:border-move-coral"
            />
          </label>
          <button
            type="submit"
            disabled={isSending}
            className="w-full rounded-full bg-move-coral px-5 py-3 font-heading text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isSending ? "Enviando…" : "Enviar"}
          </button>
          {result && (
            <p
              className={`font-body text-sm ${result.ok ? "text-move-green" : "text-move-coral"}`}
            >
              {result.ok ? "¡Enviado!" : result.error}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
