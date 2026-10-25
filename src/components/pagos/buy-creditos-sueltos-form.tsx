"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { buyCreditosSueltos } from "@/app/pagos/actions";
import { checkPagoStatus } from "@/app/suscripcion/actions";
import { formatCOP, precioCreditosSueltos, MINIMO_CREDITOS_SUELTOS } from "@/lib/credits-pricing";
import CardFields from "./card-fields";
import ApprovedModal from "./approved-modal";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/locale";

function wompiApiBase(publicKey: string): string {
  return publicKey.startsWith("pub_prod_")
    ? "https://production.wompi.co/v1"
    : "https://sandbox.wompi.co/v1";
}

export default function BuyCreditosSueltosForm({
  publicKey,
  permalinkAcceptance,
  permalinkPersonalAuth,
  locale,
}: {
  publicKey: string;
  permalinkAcceptance: string;
  permalinkPersonalAuth: string;
  locale: Locale;
}) {
  const t = getDictionary(locale).pagos;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<number | null>(null);
  const [pending, setPending] = useState(false);
  const submittingRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);

  const [cantidad, setCantidad] = useState(MINIMO_CREDITOS_SUELTOS);
  const precio = precioCreditosSueltos(cantidad);

  const [number, setNumber] = useState("");
  const [expMonth, setExpMonth] = useState("");
  const [expYear, setExpYear] = useState("");
  const [cvc, setCvc] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [accepted, setAccepted] = useState(false);

  function ajustarCantidad(delta: number) {
    setCantidad((prev) => Math.max(MINIMO_CREDITOS_SUELTOS, prev + delta));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setError(null);

    try {
      if (!accepted) {
        setError(t.debeAceptarTerminos);
        return;
      }

      const res = await fetch(`${wompiApiBase(publicKey)}/tokens/cards`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${publicKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          number: number.replace(/\s+/g, ""),
          cvc,
          exp_month: expMonth,
          exp_year: expYear,
          card_holder: cardHolder,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.data?.id) {
        setError(json?.error?.messages ? JSON.stringify(json.error.messages) : t.revisaTarjeta);
        return;
      }

      startTransition(async () => {
        const result = await buyCreditosSueltos(cantidad, json.data.id);
        if (!result.ok) {
          if (result.pending && result.reference) {
            setPending(true);
            // Ver el mismo comentario en buy-topup-form.tsx.
            const reference = result.reference;
            for (let intento = 0; intento < 15; intento++) {
              await new Promise((r) => setTimeout(r, 2000));
              const estado = await checkPagoStatus(reference);
              if (estado?.estado === "Aprobado") {
                setPending(false);
                setSuccess(estado.creditos);
                return;
              }
              if (estado?.estado === "Rechazado") {
                setPending(false);
                setError(t.pagoRechazado);
                return;
              }
            }
            setTimeout(() => router.push("/mi-suscripcion"), 2500);
            return;
          }
          setError(result.error);
          return;
        }
        setSuccess(result.credits);
      });
    } catch {
      setError(t.noConectoWompi);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  if (success !== null) {
    return (
      <ApprovedModal
        title={t.creditosSueltos.compraAprobadaTitle}
        message={t.creditosSueltos.compraAprobadaMessage(success)}
        buttonLabel={t.verMiPerfil}
        onClose={() => router.push("/mi-suscripcion")}
      />
    );
  }

  if (pending) {
    return (
      <p className="rounded-2xl border border-move-green/10 bg-white p-6 font-body text-sm font-medium text-move-green">
        {t.pagoEnProceso}
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-move-green/10 bg-white p-6">
      <label className="block">
        <span className="font-heading text-sm font-medium text-move-green">
          {t.creditosSueltos.cantidadLabel}
        </span>
        <div className="mt-2 flex items-center gap-3">
          <button
            type="button"
            onClick={() => ajustarCantidad(-1)}
            disabled={cantidad <= MINIMO_CREDITOS_SUELTOS}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-move-green/20 font-heading text-lg font-semibold text-move-green transition-colors hover:border-move-green disabled:opacity-40"
          >
            −
          </button>
          <span className="w-10 text-center font-heading text-lg font-bold text-move-green">
            {cantidad}
          </span>
          <button
            type="button"
            onClick={() => ajustarCantidad(1)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-move-green/20 font-heading text-lg font-semibold text-move-green transition-colors hover:border-move-green"
          >
            +
          </button>
          <span className="font-heading text-lg font-bold text-move-coral">
            {t.creditosSueltos.total(formatCOP(precio))}
          </span>
        </div>
      </label>

      <CardFields
        number={number}
        setNumber={setNumber}
        cardHolder={cardHolder}
        setCardHolder={setCardHolder}
        expMonth={expMonth}
        setExpMonth={setExpMonth}
        expYear={expYear}
        setExpYear={setExpYear}
        cvc={cvc}
        setCvc={setCvc}
        accepted={accepted}
        setAccepted={setAccepted}
        permalinkAcceptance={permalinkAcceptance}
        permalinkPersonalAuth={permalinkPersonalAuth}
        t={t.cardFields}
      />

      {error && <p className="font-body text-sm text-move-coral">{error}</p>}

      <button
        type="submit"
        disabled={isPending || submitting}
        className="w-full rounded-full bg-move-coral px-6 py-3 font-heading text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {isPending || submitting ? t.procesando : t.creditosSueltos.comprarPorPrecio(formatCOP(precio))}
      </button>
    </form>
  );
}
