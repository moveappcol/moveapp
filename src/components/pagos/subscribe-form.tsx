"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { subscribeToPlan, applyCoupon, redeemFreeCoupon, type CouponPreview } from "@/app/suscripcion/actions";
import { formatCOP } from "@/lib/credits-pricing";
import CardFields from "./card-fields";
import ApprovedModal from "./approved-modal";
import SubscribeTracker from "@/components/analytics/subscribe-tracker";

function wompiApiBase(publicKey: string): string {
  return publicKey.startsWith("pub_prod_")
    ? "https://production.wompi.co/v1"
    : "https://sandbox.wompi.co/v1";
}

type CouponState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "invalid"; error: string }
  | { status: "valid-descuento"; descuentoPorcentaje: number; fechaInicio?: string }
  | { status: "valid-gratis"; creditos: number };

function formatFechaLarga(fechaISO: string): string {
  return new Date(`${fechaISO}T00:00:00`).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function SubscribeForm({
  planId,
  planPrice,
  publicKey,
  permalinkAcceptance,
  permalinkPersonalAuth,
  initialCouponCode,
}: {
  planId: string;
  planPrice: number;
  publicKey: string;
  permalinkAcceptance: string;
  permalinkPersonalAuth: string;
  /** Cupón que se intenta aplicar solo al cargar, sin que la persona escriba
   * nada (ej. la promo UNIQUE1 por defecto). Si ya no está activo en
   * Airtable, se falla en silencio y el campo queda vacío — no tiene
   * sentido mostrar un error por un cupón que nadie escribió a mano. */
  initialCouponCode?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<number | null>(null);
  const [pending, setPending] = useState(false);
  // Guarda de reentrada contra doble clic/doble tap: `isPending` (de
  // useTransition) solo se activa una vez llamamos a subscribeToPlan, pero
  // antes de eso hay un round-trip real a Wompi (tokenizar la tarjeta) sin
  // ninguna protección — un segundo tap en esa ventana disparaba un cobro y
  // un abono de créditos duplicados. El ref frena eso de una, sin esperar
  // al siguiente render.
  const submittingRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);

  const [number, setNumber] = useState("");
  const [expMonth, setExpMonth] = useState("");
  const [expYear, setExpYear] = useState("");
  const [cvc, setCvc] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [accepted, setAccepted] = useState(false);

  const [couponInput, setCouponInput] = useState(initialCouponCode ?? "");
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const [coupon, setCoupon] = useState<CouponState>({ status: "idle" });

  async function tryApplyCoupon(code: string): Promise<CouponPreview> {
    setCoupon({ status: "loading" });
    const result: CouponPreview = await applyCoupon(code);
    if (!result.ok) {
      setCoupon({ status: "invalid", error: result.error });
      setCouponCode(null);
      return result;
    }
    setCouponCode(code);
    if (result.tipo === "Créditos gratis") {
      setCoupon({ status: "valid-gratis", creditos: result.creditos });
    } else {
      setCoupon({
        status: "valid-descuento",
        descuentoPorcentaje: result.descuentoPorcentaje,
        fechaInicio: result.fechaInicio,
      });
    }
    return result;
  }

  async function handleApplyCoupon() {
    if (!couponInput.trim()) return;
    await tryApplyCoupon(couponInput.trim());
  }

  // Aplica el cupón por defecto (ej. UNIQUE1) apenas carga el formulario,
  // sin que la persona tenga que escribirlo. No usa tryApplyCoupon (que
  // marca "loading" de una) para no disparar un setState sincrónico dentro
  // del efecto — si ya no está activo, se deshace en silencio, sin mostrar
  // error por un cupón que nadie escribió a mano.
  useEffect(() => {
    if (!initialCouponCode) return;
    applyCoupon(initialCouponCode).then((result) => {
      if (!result.ok) {
        setCouponInput("");
        return;
      }
      setCouponCode(initialCouponCode);
      if (result.tipo === "Créditos gratis") {
        setCoupon({ status: "valid-gratis", creditos: result.creditos });
      } else {
        setCoupon({
          status: "valid-descuento",
          descuentoPorcentaje: result.descuentoPorcentaje,
          fechaInicio: result.fechaInicio,
        });
      }
    });
    // Solo debe correr una vez, al montar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleRedeemFreeCoupon() {
    if (!couponCode) return;
    setError(null);
    startTransition(async () => {
      const result = await redeemFreeCoupon(couponCode);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess(result.credits);
    });
  }

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
        const result = await subscribeToPlan(
          planId,
          json.data.id,
          coupon.status === "valid-descuento" && couponCode ? couponCode : undefined
        );
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

  const discountedPrice =
    coupon.status === "valid-descuento" ? Math.round(planPrice * (1 - coupon.descuentoPorcentaje / 100)) : null;

  if (success !== null) {
    return (
      <>
        {/* Solo cuenta como "Subscribe" si de verdad se cobró una tarjeta —
            reclamar créditos gratis (coupon.status "valid-gratis") no crea
            ninguna suscripción, ver el comentario en redeemFreeCoupon. */}
        {coupon.status !== "valid-gratis" && <SubscribeTracker value={discountedPrice ?? planPrice} />}
        <ApprovedModal
          title="Tu suscripción fue aprobada"
          message="Gracias por ser parte de UNIQUE."
          buttonLabel="Ver mi perfil"
          onClose={() => router.push("/mi-suscripcion")}
        />
      </>
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
    <div className="space-y-4">
      <div className="rounded-2xl border border-move-green/10 bg-white p-6">
        <label className="block">
          <span className="font-heading text-sm font-medium text-move-green">¿Tienes un cupón?</span>
          <div className="mt-2 flex gap-2">
            <input
              type="text"
              value={couponInput}
              onChange={(e) => {
                setCouponInput(e.target.value);
                setCoupon({ status: "idle" });
                setCouponCode(null);
              }}
              placeholder="Código de cupón"
              className="w-full rounded-xl border border-move-green/20 px-4 py-3 font-body text-move-green outline-none focus:border-move-coral"
            />
            <button
              type="button"
              onClick={handleApplyCoupon}
              disabled={coupon.status === "loading" || !couponInput.trim()}
              className="whitespace-nowrap rounded-xl border border-move-green/20 px-4 py-3 font-heading text-sm font-semibold text-move-green transition-colors hover:border-move-green disabled:opacity-50"
            >
              {coupon.status === "loading" ? "Validando…" : "Aplicar"}
            </button>
          </div>
        </label>

        {coupon.status === "invalid" && (
          <p className="mt-2 font-body text-sm text-move-coral">{coupon.error}</p>
        )}
        {coupon.status === "valid-descuento" && (
          <p className="mt-2 font-body text-sm font-medium text-move-green">
            Cupón aplicado: -{coupon.descuentoPorcentaje}% — pagas {formatCOP(discountedPrice ?? planPrice)}{" "}
            en vez de {formatCOP(planPrice)}.
            {coupon.fechaInicio && (
              <>
                {" "}
                Se cobra hoy, pero tu plan empieza a correr el{" "}
                <strong>{formatFechaLarga(coupon.fechaInicio)}</strong> — tu próximo cobro será un mes
                después de esa fecha.
              </>
            )}
          </p>
        )}
        {coupon.status === "valid-gratis" && (
          <p className="mt-2 font-body text-sm font-medium text-move-green">
            Cupón aplicado: te da {coupon.creditos} créditos gratis, sin necesidad de tarjeta.
          </p>
        )}
      </div>

      {coupon.status === "valid-gratis" ? (
        <div className="space-y-4 rounded-2xl border border-move-green/10 bg-white p-6">
          {error && <p className="font-body text-sm text-move-coral">{error}</p>}
          <button
            type="button"
            onClick={handleRedeemFreeCoupon}
            disabled={isPending}
            className="w-full rounded-full bg-move-coral px-6 py-3 font-heading text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isPending ? "Procesando…" : `Reclamar ${coupon.creditos} créditos gratis`}
          </button>
        </div>
      ) : (
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
            {isPending || submitting
              ? "Procesando…"
              : discountedPrice !== null
                ? `Suscribirme — ${formatCOP(discountedPrice)}`
                : "Suscribirme"}
          </button>
        </form>
      )}
    </div>
  );
}
