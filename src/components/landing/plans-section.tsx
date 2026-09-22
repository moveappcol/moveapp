import Link from "next/link";
import { auth, currentUser } from "@clerk/nextjs/server";
import {
  CREDIT_PLANS,
  CREDIT_TOPUPS,
  formatCOP,
} from "@/lib/credits-pricing";
import { getSubscriptionByEmail } from "@/lib/subscriptions";
import CreditCalculator from "./credit-calculator";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";

export default async function PlansSection() {
  const { userId } = await auth();
  const locale = await getLocale();
  const t = getDictionary(locale).home.plans;

  let hasActiveSubscription = false;
  if (userId) {
    const user = await currentUser();
    const email = user?.primaryEmailAddress?.emailAddress;
    if (email) {
      const subscription = await getSubscriptionByEmail(email);
      hasActiveSubscription = subscription?.estado === "Activa";
    }
  }

  return (
    <section id="planes" className="bg-move-green/[0.03]">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="max-w-2xl">
          <h2 className="font-heading text-3xl font-bold text-move-green">{t.title}</h2>
          <p className="mt-2 font-body text-move-green/70">{t.subtitle}</p>
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
              <p className="mt-2 font-heading text-3xl font-bold text-move-green">
                {formatCOP(plan.price)}
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
            </div>
          ))}
        </div>

        <div className="mt-16">
          <h3 className="font-heading text-xl font-semibold text-move-green">
            {t.creditosAdicionalesTitle}
          </h3>
          <p className="mt-2 max-w-xl font-body text-move-green/70">{t.creditosAdicionalesBody}</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {CREDIT_TOPUPS.map((topup) => (
              <div
                key={topup.id}
                className="flex items-center justify-between rounded-2xl border border-move-green/10 bg-white px-6 py-4"
              >
                <div>
                  <span className="block font-heading text-sm font-medium text-move-green">
                    {topup.label}
                  </span>
                  <span className="block font-heading text-sm font-semibold text-move-coral">
                    {formatCOP(topup.price)}
                  </span>
                </div>
                {!userId ? (
                  <Link
                    href="/crear-cuenta"
                    className="rounded-full bg-move-green px-4 py-2 font-heading text-xs font-semibold text-white transition-opacity hover:opacity-90"
                  >
                    {t.comprar}
                  </Link>
                ) : hasActiveSubscription ? (
                  <Link
                    href={`/comprar-creditos/${topup.id}`}
                    className="rounded-full bg-move-green px-4 py-2 font-heading text-xs font-semibold text-white transition-opacity hover:opacity-90"
                  >
                    {t.comprar}
                  </Link>
                ) : (
                  <span
                    title={t.necesitasPlanActivo}
                    className="cursor-not-allowed rounded-full bg-move-green/30 px-4 py-2 font-heading text-xs font-semibold text-white/80"
                  >
                    {t.comprar}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16">
          <CreditCalculator locale={locale} />
        </div>

        <p className="mt-6 font-body text-sm text-move-green/60">{t.disclaimer}</p>
      </div>
    </section>
  );
}
