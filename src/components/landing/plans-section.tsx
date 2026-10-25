import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import {
  CREDIT_PLANS,
  formatCOP,
  ahorroPorcentaje,
  PRECIO_CREDITO_SUELTO,
  MINIMO_CREDITOS_SUELTOS,
} from "@/lib/credits-pricing";
import { validateCoupon, DEFAULT_COUPON_CODE } from "@/lib/cupones";
import CreditCalculator from "./credit-calculator";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";

export default async function PlansSection() {
  const { userId } = await auth();
  const locale = await getLocale();
  const t = getDictionary(locale).home.plans;

  // Mismo cupón que se aplica solo en el checkout (ver DEFAULT_COUPON_CODE)
  // — se valida acá también para mostrar el precio ya descontado en la
  // tarjeta del plan, a cualquiera que entre, tenga o no cuenta. Si el
  // cupón se desactiva o vence en Airtable, esto deja de mostrarse solo,
  // sin tocar código.
  const descuentoResult = await validateCoupon(DEFAULT_COUPON_CODE);
  const descuentoPorcentaje =
    descuentoResult.ok && descuentoResult.cupon.tipo === "Descuento"
      ? descuentoResult.cupon.descuentoPorcentaje
      : null;

  return (
    <section id="planes" className="bg-move-green/[0.03]">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="max-w-2xl">
          <h2 className="font-heading text-3xl font-bold text-move-green">{t.title}</h2>
          <p className="mt-2 font-body text-move-green/70">{t.subtitle}</p>
        </div>

        <div className="mt-8 rounded-2xl border border-move-coral bg-white px-6 py-5">
          <h3 className="font-heading text-lg font-semibold text-move-green">{t.trialTitle}</h3>
          <p className="mt-1 max-w-xl font-body text-sm text-move-green/70">{t.trialBody}</p>
          <Link
            href={userId ? "/prueba" : "/crear-cuenta"}
            className="mt-4 inline-block rounded-full bg-move-coral px-5 py-2.5 font-heading text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            {t.trialCta}
          </Link>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {CREDIT_PLANS.map((plan, i) => (
            <div
              key={plan.id}
              className={`flex flex-col rounded-3xl border p-8 ${
                i === 1
                  ? "border-move-coral bg-white shadow-lg"
                  : "border-move-green/10 bg-white"
              }`}
            >
              {i === 1 && (
                <span className="mb-4 w-fit rounded-full bg-move-coral px-3 py-1 font-heading text-xs font-semibold text-white">
                  {t.masPopular}
                </span>
              )}
              <p className="font-heading text-sm font-semibold uppercase tracking-wide text-move-coral">
                {plan.name}
              </p>
              <p className="mt-1 font-heading text-lg font-semibold text-move-green">
                {plan.label}
              </p>
              {descuentoPorcentaje ? (
                <div className="mt-2 flex flex-wrap items-baseline gap-2">
                  <p className="font-body text-lg text-move-green/40 line-through">
                    {formatCOP(plan.price)}
                  </p>
                  <span className="rounded-full bg-move-coral px-2 py-0.5 font-heading text-xs font-bold text-white">
                    -{descuentoPorcentaje}%
                  </span>
                  <p className="w-full font-heading text-3xl font-bold text-move-green">
                    {formatCOP(Math.round(plan.price * (1 - descuentoPorcentaje / 100)))}
                  </p>
                </div>
              ) : (
                <p className="mt-2 font-heading text-3xl font-bold text-move-green">
                  {formatCOP(plan.price)}
                </p>
              )}
              <p className="mt-1 font-heading text-xs font-bold text-move-coral">
                {t.ahorras(ahorroPorcentaje(plan))}
              </p>
              <p className="mt-1 font-body text-sm text-move-green/60">{t.billedMonthly}</p>
              {userId ? (
                <Link
                  href={`/suscribirse/${plan.id}`}
                  className={`mt-6 rounded-full px-6 py-3 text-center font-heading text-sm font-semibold transition-opacity hover:opacity-90 ${
                    i === 1
                      ? "bg-move-coral text-white"
                      : "bg-move-green text-white"
                  }`}
                >
                  {t.elegirPlan}
                </Link>
              ) : (
                <Link
                  href="/crear-cuenta"
                  className={`mt-6 rounded-full px-6 py-3 text-center font-heading text-sm font-semibold transition-opacity hover:opacity-90 ${
                    i === 1
                      ? "bg-move-coral text-white"
                      : "bg-move-green text-white"
                  }`}
                >
                  {t.elegirPlan}
                </Link>
              )}
              <Link
                href={`/regalar/${plan.id}`}
                className="mt-2 text-center font-body text-xs font-medium text-move-green/50 underline-offset-2 hover:text-move-coral hover:underline"
              >
                Regalar este plan 🎁
              </Link>
            </div>
          ))}
        </div>

        <div className="mt-16 rounded-2xl border border-move-green/10 bg-white px-6 py-5">
          <h3 className="font-heading text-lg font-semibold text-move-green">
            {t.creditosSueltosTitle}
          </h3>
          <p className="mt-1 max-w-xl font-body text-sm text-move-green/70">
            {t.creditosSueltosBody(formatCOP(PRECIO_CREDITO_SUELTO), MINIMO_CREDITOS_SUELTOS)}
          </p>
          <Link
            href={userId ? "/creditos-sueltos" : "/crear-cuenta"}
            className="mt-4 inline-block rounded-full bg-move-green px-5 py-2.5 font-heading text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            {t.creditosSueltosCta}
          </Link>
        </div>

        <div className="mt-16">
          <CreditCalculator locale={locale} />
        </div>

        <p className="mt-6 font-body text-sm text-move-green/60">{t.disclaimer}</p>
      </div>
    </section>
  );
}
