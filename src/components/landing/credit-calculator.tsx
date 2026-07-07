"use client";

import { useMemo, useState } from "react";
import {
  estimateCostForCredits,
  estimateCreditsForBudget,
  formatCOP,
} from "@/lib/credits-pricing";

type Mode = "credits" | "budget";

export default function CreditCalculator() {
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
      <h3 className="font-heading text-xl font-semibold text-move-green">
        Calculadora de créditos
      </h3>
      <p className="mt-1 font-body text-sm text-move-green/70">
        Dinos cuántos créditos quieres, o cuánto quieres gastar, y te
        mostramos la combinación de plan + adicionales más conveniente.
      </p>

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
          Quiero X créditos
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
          Tengo un presupuesto
        </button>
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2 sm:items-start">
        <div>
          {mode === "credits" ? (
            <label className="block">
              <span className="font-heading text-sm font-medium text-move-green">
                Créditos que quieres tener
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
                Tu presupuesto (COP)
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
                {mode === "credits" ? "Precio estimado" : "Créditos que alcanzas"}
              </p>
              <p className="mt-1 font-heading text-3xl font-bold text-move-green">
                {mode === "credits"
                  ? formatCOP(result.cost)
                  : `${result.credits} créditos`}
              </p>
              <p className="mt-2 font-body text-sm text-move-green/70">
                {mode === "credits"
                  ? `Te alcanza para ${result.credits} créditos.`
                  : `Por ${formatCOP(result.cost)}.`}
              </p>
              <ul className="mt-3 space-y-1 font-body text-sm text-move-green/70">
                <li>
                  Plan {result.plan.label} — {formatCOP(result.plan.price)}
                </li>
                {result.topups.map((item) => (
                  <li key={item.pkg.id}>
                    {item.quantity}× adicional de {item.pkg.label} —{" "}
                    {formatCOP(item.pkg.price * item.quantity)}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="font-body text-sm text-move-green/70">
              {mode === "budget"
                ? "Tu presupuesto no alcanza ni para el plan más pequeño (25 créditos por $200.000)."
                : "Ingresa un número de créditos mayor a 0."}
            </p>
          )}
        </div>
      </div>

      <p className="mt-6 font-body text-xs text-move-green/50">
        Estimado combinando 1 plan mensual + créditos adicionales. Los
        créditos adicionales solo se pueden comprar durante el mes de un
        plan activo, y los créditos vencen al cumplirse el mes.
      </p>
    </div>
  );
}
