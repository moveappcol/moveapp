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
    <div className="text-center">
      {/* Versión de pantalla — la tarjeta festiva verde + fotos de la caja.
       * Se oculta al imprimir (print:hidden): las fotos y el fondo oscuro no
       * tienen sentido en papel, ahí se usa la tarjeta de abajo en su lugar. */}
      <div className="print:hidden">
        <p className="font-heading text-xs font-bold uppercase tracking-[0.3em] text-white/55">
          Un regalo para ti
        </p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/email/gift-box-closed.png" alt="" className="mx-auto mt-5 w-40" />

        <p className="mt-6 font-heading text-xs font-bold uppercase tracking-[0.25em] text-move-coral">
          Tu código
        </p>
        <p className="mt-2 font-heading text-4xl font-extrabold tracking-widest text-white">
          {codigo}
        </p>
        <p className="mt-2 font-body text-sm text-white/60">{planLabel}</p>

        {yaCanjeado ? (
          <p className="mt-3 font-heading text-sm font-semibold text-white">
            Este código ya fue canjeado.
          </p>
        ) : (
          <p className="mt-3 font-body text-sm text-white/85">Válido hasta el {fechaLimiteLabel}</p>
        )}

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/email/gift-box-open.png" alt="" className="mx-auto mt-6 w-full max-w-md" />
      </div>

      {/* Versión de impresión — tarjeta con borde, como una tarjeta de
       * regalo física: nada de fotos ni fondo oscuro (desperdicia tinta),
       * pero tampoco texto suelto sin forma. Oculta en pantalla (hidden),
       * visible solo al imprimir (print:block). */}
      <div className="hidden print:block print:rounded-3xl print:border-2 print:border-dashed print:border-move-coral print:bg-white print:p-10">
        <p className="font-heading text-xs font-bold uppercase tracking-[0.3em] text-move-green/50">
          Regalo UNIQUE
        </p>
        <p className="mt-4 font-heading text-4xl font-extrabold tracking-widest text-move-coral">
          {codigo}
        </p>
        <p className="mt-3 font-body text-sm text-move-green/70">{planLabel}</p>
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
          className="flex-1 rounded-full border border-white/25 px-5 py-3 font-heading text-sm font-medium text-white transition-colors hover:border-white"
        >
          Imprimir
        </button>
      </div>

      {!yaCanjeado && (
        <form action={formAction} className="mt-6 space-y-3 text-left print:hidden">
          <label className="block">
            <span className="font-heading text-sm font-medium text-white">
              O envíaselo directo por correo
            </span>
            <input
              type="email"
              name="correo"
              required
              placeholder="correo@ejemplo.com"
              className="mt-1 w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 font-body text-sm text-white placeholder:text-white/40 outline-none focus:border-move-coral"
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
              className={`text-center font-body text-sm ${result.ok ? "text-white" : "text-move-coral"}`}
            >
              {result.ok ? "¡Enviado!" : result.error}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
