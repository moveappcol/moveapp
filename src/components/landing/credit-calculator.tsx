"use client";

import { useMemo, useState } from "react";
import {
  CREDIT_PLANS,
  estimateCostForCredits,
  estimateCreditsForBudget,
  formatCOP,
} from "@/lib/credits-pricing";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/locale";

type Mode = "credits" | "budget";

const CHEAPEST_PLAN = CREDIT_PLANS.reduce((min, p) => (p.price < min.price ? p : min));

export default function CreditCalculator({ locale }: { locale: Locale }) {
  const t = getDictionary(locale).home.calculator;
  const [mode, setMode] = useState<Mode>("credits");
  const [creditsInput, setCreditsInput] = useState("30");
  const [budgetInput, setBudgetInput] = useState("250000");

  const result = useMemo(() => {
    if (mode === "credits") {
      const value = Number(creditsInput);
      if (!Number.isFinite(value) || value <= 0) return null;
      return estimateCostForCredits(Math.round(value));
    }
    const value = Number(budgetInput);
    if (!Number.isFinite(value) || value <= 0) return null;
    return estimateCreditsForBudget(Math.round(value));
  }, [mode, creditsInput, budgetInput]);

  return (
    <div className="rounded-3xl border border-move-green/10 bg-white p-6 shadow-sm sm:p-8">
      <h3 className="font-heading text-xl font-semibold text-move-green">{t.title}</h3>
      <p className="mt-1 font-body text-sm text-move-green/70">{t.subtitle}</p>

      <div className="mt-6 inline-flex rounded-full bg-move-green/5 p-1">
        <button
          type="button"
          onClick={() => setMode("credits")}
          className={`rounded-full px-4 py-2 font-heading text-sm font-medium transition-colors ${
            mode === "credits"
              ? "bg-move-coral text-white"
              : "text-move-green/70 hover:text-move-green"
          }`}
        >
          {t.modeCredits}
        </button>
        <button
          type="button"
          onClick={() => setMode("budget")}
          className={`rounded-full px-4 py-2 font-heading text-sm font-medium transition-colors ${
            mode === "budget"
              ? "bg-move-coral text-white"
              : "text-move-green/70 hover:text-move-green"
          }`}
        >
          {t.modeBudget}
        </button>
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2 sm:items-start">
        <div>
          {mode === "credits" ? (
            <label className="block">
              <span className="font-heading text-sm font-medium text-move-green">
                {t.creditsLabel}
              </span>
              <input
                type="number"
                min={1}
                value={creditsInput}
                onChange={(e) => setCreditsInput(e.target.value)}
                className="mt-2 w-full rounded-xl border border-move-green/20 px-4 py-3 font-body text-move-green outline-none focus:border-move-coral"
              />
            </label>
          ) : (
            <label className="block">
              <span className="font-heading text-sm font-medium text-move-green">
                {t.budgetLabel}
              </span>
              <input
                type="number"
                min={1}
                step={1000}
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)}
                className="mt-2 w-full rounded-xl border border-move-green/20 px-4 py-3 font-body text-move-green outline-none focus:border-move-coral"
              />
            </label>
          )}
        </div>

        <div className="rounded-2xl bg-move-green/5 p-5">
          {result ? (
            <>
              <p className="font-heading text-sm font-medium text-move-green/70">
                {mode === "credits" ? t.precioEstimado : t.creditosQueAlcanzas}
              </p>
              <p className="mt-1 font-heading text-3xl font-bold text-move-green">
                {mode === "credits"
                  ? formatCOP(result.cost)
                  : `${result.credits} ${locale === "en" ? "credits" : "créditos"}`}
              </p>
              <p className="mt-2 font-body text-sm text-move-green/70">
                {mode === "credits"
                  ? t.teAlcanzaPara(result.credits)
                  : t.porPrecio(formatCOP(result.cost))}
              </p>
              <ul className="mt-3 space-y-1 font-body text-sm text-move-green/70">
                <li>{t.planLine(result.plan.name ?? "", result.plan.label, formatCOP(result.plan.price))}</li>
                {result.topups.map((item) => (
                  <li key={item.pkg.id}>
                    {t.topupLine(item.quantity, item.pkg.label, formatCOP(item.pkg.price * item.quantity))}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="font-body text-sm text-move-green/70">
              {mode === "budget"
                ? t.presupuestoInsuficiente(CHEAPEST_PLAN.label, formatCOP(CHEAPEST_PLAN.price))
                : t.ingresaNumero}
            </p>
          )}
        </div>
      </div>

      <p className="mt-6 font-body text-xs text-move-green/50">{t.footnote}</p>
    </div>
  );
}
