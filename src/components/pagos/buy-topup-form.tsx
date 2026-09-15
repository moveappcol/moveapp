"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { buyTopup } from "@/app/pagos/actions";
import { formatCOP } from "@/lib/credits-pricing";
import CardFields from "./card-fields";
import ApprovedModal from "./approved-modal";

function wompiApiBase(publicKey: string): string {
  return publicKey.startsWith("pub_prod_")
    ? "https://production.wompi.co/v1"
    : "https://sandbox.wompi.co/v1";
}

export default function BuyTopupForm({
  topupId,
  topupPrice,
  publicKey,
  permalinkAcceptance,
  permalinkPersonalAuth,
}: {
  topupId: string;
  topupPrice: number;
  publicKey: string;
  permalinkAcceptance: string;
  permalinkPersonalAuth: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<number | null>(null);
  const [pending, setPending] = useState(false);
  // Ver el mismo comentario en subscribe-form.tsx: `isPending` solo cubre
  // el tramo de la server action, no el round-trip de tokenizar la tarjeta.
  const submittingRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);

  const [number, setNumber] = useState("");
  const [expMonth, setExpMonth] = useState("");
  const [expYear, setExpYear] = useState("");
  const [cvc, setCvc] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [accepted, setAccepted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setError(null);

    try {
      if (!accepted) {
        setError("Debes aceptar los términos y el tratamiento de datos.");
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
        setError(json?.error?.messages ? JSON.stringify(json.error.messages) : "Revisa los datos de la tarjeta.");
        return;
      }

      startTransition(async () => {
        const result = await buyTopup(topupId, json.data.id);
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
      });
    } catch {
      setError("No pudimos conectar con Wompi. Intenta de nuevo.");
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  if (success !== null) {
    return (
      <ApprovedModal
        title="Tu compra fue aprobada"
        message={`Ya tienes ${success} créditos adicionales disponibles.`}
        buttonLabel="Ver mi perfil"
        onClose={() => router.push("/mi-suscripcion")}
      />
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
      />

      {error && <p className="font-body text-sm text-move-coral">{error}</p>}

      <button
        type="submit"
        disabled={isPending || submitting}
        className="w-full rounded-full bg-move-coral px-6 py-3 font-heading text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {isPending || submitting ? "Procesando…" : `Comprar — ${formatCOP(topupPrice)}`}
      </button>
    </form>
  );
}
