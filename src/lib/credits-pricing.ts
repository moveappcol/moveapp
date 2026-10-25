export type CreditPackage = {
  id: string;
  name?: string;
  label: string;
  credits: number;
  price: number;
};

export const CREDIT_PLANS: CreditPackage[] = [
  { id: "plan-starter", name: "Starter", label: "32 créditos", credits: 32, price: 209_900 },
  { id: "plan-balance", name: "Balance", label: "64 créditos", credits: 64, price: 384_900 },
  { id: "plan-volume", name: "Volume", label: "100 créditos", credits: 100, price: 569_900 },
];

export const CREDIT_TOPUPS: CreditPackage[] = [
  { id: "topup-5", label: "5 créditos", credits: 5, price: 39_900 },
  { id: "topup-10", label: "10 créditos", credits: 10, price: 74_900 },
  { id: "topup-15", label: "15 créditos", credits: 15, price: 109_900 },
];

/** Prueba UNIQUE de 1 semana: pago único, 16 créditos, vigentes exactamente
 * TRIAL_DURATION_DAYS desde el pago (no un mes como un plan) — si no se
 * cancela antes de que termine, se cobra el plan Starter automáticamente
 * (ver chargeTrial/convertirPruebaAStarter en billing.ts). */
export const TRIAL_PLAN: CreditPackage = {
  id: "trial-1semana",
  name: "Prueba UNIQUE",
  label: "16 créditos",
  credits: 16,
  price: 69_000,
};
export const TRIAL_DURATION_DAYS = 7;

/** Créditos sueltos: precio fijo por crédito, sin necesidad de plan ni de
 * ningún paquete fijo — para quien solo quiere probar una clase o
 * experiencia puntual, donde el mínimo de 5 de un topup normal lo
 * obligaría a comprar de más. Mínimo de 3 créditos (no desde 1): bajo eso,
 * la parte fija de la comisión de Wompi pesa demasiado proporcionalmente —
 * y antes que sumar un cargo operativo aparte para compras chicas (que
 * complica el precio: "$8.000 por crédito" dejaba de ser cierto en la
 * práctica), se prefiere mantener el precio siempre exacto y simple. */
export const PRECIO_CREDITO_SUELTO = 8_000;
export const MINIMO_CREDITOS_SUELTOS = 3;

/** Precio total de comprar `cantidad` créditos sueltos. */
export function precioCreditosSueltos(cantidad: number): number {
  return cantidad * PRECIO_CREDITO_SUELTO;
}

/** Lo que cuesta, en promedio, una clase suelta pagada directo en el
 * gimnasio (sin plan UNIQUE) por cada crédito que esa clase vale — ej. una
 * clase de 8 créditos ronda los $71.000–$80.000 sueltos, una de 6 créditos
 * ronda los $51.000–$60.000. Se usa solo para mostrar el % de ahorro de
 * cada plan frente a pagar suelto; no viene de Airtable porque ningún
 * gimnasio publica un precio por clase individual que se pueda leer ahí.
 * Si cambia la referencia de mercado, ajustar acá nomás. */
export const PRECIO_CLASE_SUELTA_POR_CREDITO = 10_000;

/** % de ahorro de un plan frente a pagar cada clase suelta en el gimnasio,
 * usando PRECIO_CLASE_SUELTA_POR_CREDITO como referencia de mercado. */
export function ahorroPorcentaje(plan: CreditPackage): number {
  const precioPorCreditoPlan = plan.price / plan.credits;
  return Math.round((1 - precioPorCreditoPlan / PRECIO_CLASE_SUELTA_POR_CREDITO) * 100);
}

export type CreditEstimate = {
  plan: CreditPackage;
  /** Créditos sueltos comprados además del plan — 0 si el plan ya alcanza. */
  extraCredits: number;
  credits: number;
  cost: number;
};

/**
 * Todas las combinaciones asumen exactamente 1 plan mensual activo, más
 * créditos sueltos opcionales encima para llegar al resto (ver
 * precioCreditosSueltos) — ya no paquetes fijos de "adicionales", que
 * exigían un plan activo para comprarse.
 */

/** Dado un número de créditos deseado, encuentra la combinación (1 plan +
 * créditos sueltos opcionales) más barata que llegue al menos a esa
 * cantidad. */
export function estimateCostForCredits(targetCredits: number): CreditEstimate | null {
  if (targetCredits <= 0) return null;

  let bestOption: CreditEstimate | null = null;
  for (const plan of CREDIT_PLANS) {
    const remainder = Math.max(0, targetCredits - plan.credits);
    // Los créditos sueltos tienen un mínimo de compra — si el resto es menor
    // a ese mínimo, hay que comprar el mínimo igual (sobra un poco).
    const extraCredits = remainder === 0 ? 0 : Math.max(remainder, MINIMO_CREDITOS_SUELTOS);
    const option: CreditEstimate = {
      plan,
      extraCredits,
      credits: plan.credits + extraCredits,
      cost: plan.price + extraCredits * PRECIO_CREDITO_SUELTO,
    };
    if (!bestOption || option.cost < bestOption.cost) bestOption = option;
  }
  return bestOption;
}

/** Dado un presupuesto, encuentra la combinación (1 plan + créditos sueltos
 * opcionales) que maximiza los créditos sin excederlo. Devuelve null si el
 * presupuesto no alcanza ni para el plan más pequeño. */
export function estimateCreditsForBudget(budget: number): CreditEstimate | null {
  if (budget <= 0) return null;

  let bestOption: CreditEstimate | null = null;
  for (const plan of CREDIT_PLANS) {
    if (plan.price > budget) continue;
    const remainingBudget = budget - plan.price;
    const affordable = Math.floor(remainingBudget / PRECIO_CREDITO_SUELTO);
    // Si el presupuesto restante no alcanza ni para el mínimo de créditos
    // sueltos, no se compra ninguno — esa plata se queda sin usar.
    const extraCredits = affordable >= MINIMO_CREDITOS_SUELTOS ? affordable : 0;
    const option: CreditEstimate = {
      plan,
      extraCredits,
      credits: plan.credits + extraCredits,
      cost: plan.price + extraCredits * PRECIO_CREDITO_SUELTO,
    };
    if (
      !bestOption ||
      option.credits > bestOption.credits ||
      (option.credits === bestOption.credits && option.cost < bestOption.cost)
    ) {
      bestOption = option;
    }
  }
  return bestOption;
}

export function formatCOP(value: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}
