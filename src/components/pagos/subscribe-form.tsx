"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { subscribeToPlan } from "@/app/suscripcion/actions";

function wompiApiBase(publicKey: string): string {
  return publicKey.startsWith("pub_prod_")
    ? "https://production.wompi.co/v1"
    : "https://sandbox.wompi.co/v1";
}

export default function SubscribeForm({
  planId,
  planLabel,
  publicKey,
  permalinkAcceptance,
  permalinkPersonalAuth,
}: {
  planId: string;
  planLabel: string;
  publicKey: string;
  permalinkAcceptance: string;
  permalinkPersonalAuth: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<number | null>(null);
  const [pending, setPending] = useState(false);

  const [number, setNumber] = useState("");
  const [expMonth, setExpMonth] = useState("");
  const [expYear, setExpYear] = useState("");
  const [cvc, setCvc] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [accepted, setAccepted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!accepted) {
      setError("Debes aceptar los términos y el tratamiento de datos.");
      return;
    }

    try {
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
        setError(json?.error?.messages ? JSON.stringify(json.error.messages) : "Revisa los datos de la tarjeta.");
        return;
      }

      startTransition(async () => {
        const result = await subscribeToPlan(planId, json.data.id);
        if (!result.ok) {
          if (result.pending) {
            setPending(true);
            setTimeout(() => router.push("/mi-suscripcion"), 2500);
            return;
          }
          setError(result.error);
          return;
        }
        setSuccess(result.credits);
        setTimeout(() => router.push("/mi-suscripcion"), 1500);
      });
    } catch {
      setError("No pudimos conectar con Wompi. Intenta de nuevo.");
    }
  }

  if (success !== null) {
    return (
      <p className="rounded-2xl border border-move-green/10 bg-white p-6 font-body text-sm font-medium text-move-green">
        ¡Listo! Tu suscripción a {planLabel} quedó activa y ya tienes {success}{" "}
        créditos disponibles.
      </p>
    );
  }

  if (pending) {
    return (
      <p className="rounded-2xl border border-move-green/10 bg-white p-6 font-body text-sm font-medium text-move-green">
        Tu pago está siendo procesado. Te avisaremos apenas se confirme —
        revisa &ldquo;Mi suscripción&rdquo; en unos minutos.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-move-green/10 bg-white p-6">
      <label className="block">
        <span className="font-heading text-sm font-medium text-move-green">Número de tarjeta</span>
        <input
          type="text"
          inputMode="numeric"
          required
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          placeholder="4242 4242 4242 4242"
          className="mt-2 w-full rounded-xl border border-move-green/20 px-4 py-3 font-body text-move-green outline-none focus:border-move-coral"
        />
      </label>

      <label className="block">
        <span className="font-heading text-sm font-medium text-move-green">Nombre en la tarjeta</span>
        <input
          type="text"
          required
          value={cardHolder}
          onChange={(e) => setCardHolder(e.target.value)}
          className="mt-2 w-full rounded-xl border border-move-green/20 px-4 py-3 font-body text-move-green outline-none focus:border-move-coral"
        />
      </label>

      <div className="grid grid-cols-3 gap-3">
        <label className="block">
          <span className="font-heading text-sm font-medium text-move-green">Mes</span>
          <input
            type="text"
            inputMode="numeric"
            required
            maxLength={2}
            placeholder="MM"
            value={expMonth}
            onChange={(e) => setExpMonth(e.target.value)}
            className="mt-2 w-full rounded-xl border border-move-green/20 px-4 py-3 font-body text-move-green outline-none focus:border-move-coral"
          />
        </label>
        <label className="block">
          <span className="font-heading text-sm font-medium text-move-green">Año</span>
          <input
            type="text"
            inputMode="numeric"
            required
            maxLength={2}
            placeholder="AA"
            value={expYear}
            onChange={(e) => setExpYear(e.target.value)}
            className="mt-2 w-full rounded-xl border border-move-green/20 px-4 py-3 font-body text-move-green outline-none focus:border-move-coral"
          />
        </label>
        <label className="block">
          <span className="font-heading text-sm font-medium text-move-green">CVC</span>
          <input
            type="text"
            inputMode="numeric"
            required
            maxLength={4}
            value={cvc}
            onChange={(e) => setCvc(e.target.value)}
            className="mt-2 w-full rounded-xl border border-move-green/20 px-4 py-3 font-body text-move-green outline-none focus:border-move-coral"
          />
        </label>
      </div>

      <label className="flex items-start gap-2 font-body text-xs text-move-green/70">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          className="mt-0.5"
        />
        <span>
          Acepto los{" "}
          <a href={permalinkAcceptance} target="_blank" rel="noopener noreferrer" className="underline">
            términos y condiciones
          </a>{" "}
          y la{" "}
          <a href={permalinkPersonalAuth} target="_blank" rel="noopener noreferrer" className="underline">
            autorización de tratamiento de datos
          </a>{" "}
          de Wompi.
        </span>
      </label>

      {error && <p className="font-body text-sm text-move-coral">{error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-full bg-move-coral px-6 py-3 font-heading text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? "Procesando…" : "Suscribirme"}
      </button>
    </form>
  );
}
