"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { buyTrial } from "@/app/prueba/actions";
import { checkPagoStatus } from "@/app/suscripcion/actions";
import { formatCOP, TRIAL_PLAN } from "@/lib/credits-pricing";
import CardFields from "./card-fields";
import ApprovedModal from "./approved-modal";
import TrialStartTracker from "@/components/analytics/trial-start-tracker";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/locale";

function wompiApiBase(publicKey: string): string {
  return publicKey.startsWith("pub_prod_")
    ? "https://production.wompi.co/v1"
    : "https://sandbox.wompi.co/v1";
}

export default function TrialCheckoutForm({
  fechaFinEstimada,
  publicKey,
  permalinkAcceptance,
  permalinkPersonalAuth,
  locale,
}: {
  /** Fecha estimada de fin, formateada — la real la confirma el servidor
   * tras el pago (se muestra en el modal de éxito). */
  fechaFinEstimada: string;
  publicKey: string;
  permalinkAcceptance: string;
  permalinkPersonalAuth: string;
  locale: Locale;
}) {
  const t = getDictionary(locale).pagos;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ credits: number; fechaFin: string } | null>(null);
  const [pending, setPending] = useState(false);
  const submittingRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);

  const [number, setNumber] = useState("");
  const [expMonth, setExpMonth] = useState("");
  const [expYear, setExpYear] = useState("");
  const [cvc, setCvc] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [accepted, setAccepted] = useState(false);
  // Casilla legal de cobro automático (Ley 1480) — SIN marcar por defecto,
  // separada de la de términos de Wompi que ya trae CardFields.
  const [aceptaCobroAutomatico, setAceptaCobroAutomatico] = useState(false);
  const [codigoReferido, setCodigoReferido] = useState("");

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
      if (!aceptaCobroAutomatico) {
        setError(t.trial.debeAceptarCasillaLegal);
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

      // Wompi suele devolver el bin/últimos 4/vencimiento en la tokenización
      // (no documentado de forma consistente) — se lee de forma defensiva,
      // sin bloquear si no vienen (ver hashTarjeta en prueba/actions.ts).
      const cardData = json.data?.card ?? json.data;
      const tarjeta = {
        bin: cardData?.bin ?? null,
        lastFour: cardData?.last_four ?? null,
        expMonth: cardData?.exp_month ?? expMonth,
        expYear: cardData?.exp_year ?? expYear,
      };

      startTransition(async () => {
        const result = await buyTrial({
          cardToken: json.data.id,
          aceptado: aceptaCobroAutomatico,
          codigoReferido: codigoReferido.trim() || undefined,
          tarjeta,
        });
        if (!result.ok) {
          if (result.pending && result.reference) {
            setPending(true);
            // Ver el mismo comentario en buy-topup-form.tsx: Wompi casi
            // siempre resuelve en segundos — se consulta antes de rendirse.
            const reference = result.reference;
            for (let intento = 0; intento < 15; intento++) {
              await new Promise((r) => setTimeout(r, 2000));
              const estado = await checkPagoStatus(reference);
              if (estado?.estado === "Aprobado") {
                setPending(false);
                setSuccess({ credits: estado.creditos, fechaFin: "" });
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
        setSuccess({ credits: result.credits, fechaFin: result.fechaFin });
      });
    } catch {
      setError(t.noConectoWompi);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  if (pending) {
    return (
      <p className="rounded-2xl border border-move-green/10 bg-white p-6 font-body text-sm font-medium text-move-green">
        {t.pagoEnProceso}
      </p>
    );
  }

  if (success !== null) {
    return (
      <>
        <TrialStartTracker value={TRIAL_PLAN.price} />
        <ApprovedModal
          title={t.trial.compraAprobadaTitle}
          message={t.trial.compraAprobadaMessage(
            success.credits,
            success.fechaFin ? new Date(success.fechaFin).toLocaleDateString(locale === "en" ? "en-US" : "es-CO", {
              timeZone: "America/Bogota",
              day: "numeric",
              month: "long",
              year: "numeric",
            }) : fechaFinEstimada
          )}
          buttonLabel={t.verMiPerfil}
          onClose={() => router.push("/mi-suscripcion")}
        />
      </>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-move-green/10 bg-white p-6">
      <p className="font-heading text-sm font-semibold text-move-green">
        {t.trial.resumenPago(formatCOP(TRIAL_PLAN.price), fechaFinEstimada)}
      </p>

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

      <label className="block">
        <span className="font-heading text-sm font-medium text-move-green">{t.trial.codigoReferidoLabel}</span>
        <input
          type="text"
          value={codigoReferido}
          onChange={(e) => setCodigoReferido(e.target.value)}
          placeholder="Código de referido"
          className="mt-2 w-full rounded-xl border border-move-green/20 px-4 py-3 font-body text-move-green outline-none focus:border-move-coral"
        />
        <span className="mt-1 block font-body text-xs text-move-green/50">{t.trial.codigoReferidoNota}</span>
      </label>

      <label className="flex items-start gap-2 rounded-xl border border-move-coral/30 bg-move-coral/5 p-3 font-body text-xs text-move-green">
        <input
          type="checkbox"
          checked={aceptaCobroAutomatico}
          onChange={(e) => setAceptaCobroAutomatico(e.target.checked)}
          className="mt-0.5"
        />
        <span>{t.trial.casillaLegal}</span>
      </label>

      {error && <p className="font-body text-sm text-move-coral">{error}</p>}

      <button
        type="submit"
        disabled={isPending || submitting}
        className="w-full rounded-full bg-move-coral px-6 py-3 font-heading text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {isPending || submitting ? t.procesando : t.trial.comprarPorPrecio(formatCOP(TRIAL_PLAN.price))}
      </button>
    </form>
  );
}
