import Link from "next/link";
import {
  CREDIT_PLANS,
  CREDIT_TOPUPS,
  formatCOP,
} from "@/lib/credits-pricing";
import CreditCalculator from "./credit-calculator";

export default function PlansSection() {
  return (
    <section id="planes" className="bg-move-green/[0.03]">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="max-w-2xl">
          <h2 className="font-heading text-3xl font-bold text-move-green">
            Planes de créditos
          </h2>
          <p className="mt-2 font-body text-move-green/70">
            Elige un plan mensual. Los créditos duran 1 mes y cada clase
            descuenta un número distinto de créditos según el gimnasio.
          </p>
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
                  Más popular
                </span>
              )}
              <p className="font-heading text-lg font-semibold text-move-green">
                {plan.label}
              </p>
              <p className="mt-2 font-heading text-3xl font-bold text-move-green">
                {formatCOP(plan.price)}
              </p>
              <p className="mt-1 font-body text-sm text-move-green/60">
                Créditos válidos por 1 mes
              </p>
              <Link
                href="/crear-cuenta"
                className={`mt-6 rounded-full px-6 py-3 text-center font-heading text-sm font-semibold transition-opacity hover:opacity-90 ${
                  i === 1
                    ? "bg-move-coral text-white"
                    : "bg-move-green text-white"
                }`}
              >
                Elegir plan
              </Link>
            </div>
          ))}
        </div>

        <div className="mt-16">
          <h3 className="font-heading text-xl font-semibold text-move-green">
            Créditos adicionales
          </h3>
          <p className="mt-2 max-w-xl font-body text-move-green/70">
            ¿Se te acabaron los créditos antes de fin de mes? Suma más sin
            esperar a tu próximo ciclo.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {CREDIT_TOPUPS.map((topup) => (
              <div
                key={topup.id}
                className="flex items-center justify-between rounded-2xl border border-move-green/10 bg-white px-6 py-4"
              >
                <span className="font-heading text-sm font-medium text-move-green">
                  {topup.label}
                </span>
                <span className="font-heading text-sm font-semibold text-move-coral">
                  {formatCOP(topup.price)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16">
          <CreditCalculator />
        </div>

        <p className="mt-6 font-body text-sm text-move-green/60">
          Puedes cancelar las clases hasta 24h antes sin costo.
        </p>
      </div>
    </section>
  );
}
