export type CreditPackage = {
  id: string;
  name?: string;
  label: string;
  credits: number;
  price: number;
};

export const CREDIT_PLANS: CreditPackage[] = [
  { id: "plan-starter", name: "Starter", label: "32 créditos", credits: 32, price: 230_000 },
  { id: "plan-balance", name: "Balance", label: "64 créditos", credits: 64, price: 415_000 },
  { id: "plan-volume", name: "Volume", label: "100 créditos", credits: 100, price: 600_000 },
];

export const CREDIT_TOPUPS: CreditPackage[] = [
  { id: "topup-5", label: "5 créditos", credits: 5, price: 45_000 },
  { id: "topup-10", label: "10 créditos", credits: 10, price: 85_000 },
  { id: "topup-15", label: "15 créditos", credits: 15, price: 120_000 },
];

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

export type PackageBreakdownItem = { pkg: CreditPackage; quantity: number };

export type CreditEstimate = {
  plan: CreditPackage;
  topups: PackageBreakdownItem[];
  credits: number;
  cost: number;
};

/**
 * Todas las combinaciones asumen exactamente 1 plan mensual activo, más
 * paquetes de créditos adicionales opcionales encima (que es como funciona
 * la compra real: los adicionales solo se compran durante el mes de un plan).
 */

function minCostTopups(remainder: number) {
  if (remainder <= 0) return { cost: 0, credits: 0, breakdown: [] as PackageBreakdownItem[] };

  const maxCredits = Math.max(...CREDIT_TOPUPS.map((p) => p.credits));
  const size = remainder + maxCredits;
  const cost = new Array(size + 1).fill(Infinity);
  const choice: (CreditPackage | null)[] = new Array(size + 1).fill(null);
  cost[0] = 0;

  for (let c = 1; c <= size; c++) {
    for (const pkg of CREDIT_TOPUPS) {
      const rem = Math.max(0, c - pkg.credits);
      const candidate = pkg.price + cost[rem];
      if (candidate < cost[c]) {
        cost[c] = candidate;
        choice[c] = pkg;
      }
    }
  }

  let best = remainder;
  for (let c = remainder; c <= size; c++) {
    if (cost[c] < cost[best]) best = c;
  }

  const map = new Map<string, PackageBreakdownItem>();
  let cursor = best;
  while (cursor > 0 && choice[cursor]) {
    const pkg = choice[cursor]!;
    const entry = map.get(pkg.id);
    if (entry) entry.quantity += 1;
    else map.set(pkg.id, { pkg, quantity: 1 });
    cursor = Math.max(0, cursor - pkg.credits);
  }

  const breakdown = Array.from(map.values());
  const credits = breakdown.reduce((s, i) => s + i.pkg.credits * i.quantity, 0);
  return { cost: cost[best], credits, breakdown };
}

function maxCreditsForTopupBudget(budget: number) {
  if (budget <= 0) return { cost: 0, credits: 0, breakdown: [] as PackageBreakdownItem[] };

  const unit = 1_000; // trabajar en miles de COP
  const size = Math.floor(budget / unit);
  const credits = new Array(size + 1).fill(0);
  const choice: (CreditPackage | null)[] = new Array(size + 1).fill(null);

  for (let b = 1; b <= size; b++) {
    credits[b] = credits[b - 1];
    for (const pkg of CREDIT_TOPUPS) {
      const priceUnits = Math.round(pkg.price / unit);
      if (priceUnits > b) continue;
      const candidate = pkg.credits + credits[b - priceUnits];
      if (candidate > credits[b]) {
        credits[b] = candidate;
        choice[b] = pkg;
      }
    }
  }

  const map = new Map<string, PackageBreakdownItem>();
  let cursor = size;
  while (cursor > 0) {
    const pkg = choice[cursor];
    if (!pkg) {
      cursor -= 1;
      continue;
    }
    const entry = map.get(pkg.id);
    if (entry) entry.quantity += 1;
    else map.set(pkg.id, { pkg, quantity: 1 });
    cursor -= Math.round(pkg.price / unit);
  }

  const breakdown = Array.from(map.values());
  const totalCredits = breakdown.reduce((s, i) => s + i.pkg.credits * i.quantity, 0);
  const totalCost = breakdown.reduce((s, i) => s + i.pkg.price * i.quantity, 0);
  return { cost: totalCost, credits: totalCredits, breakdown };
}

/** Dado un número de créditos deseado, encuentra la combinación (1 plan +
 * adicionales opcionales) más barata que llegue al menos a esa cantidad. */
export function estimateCostForCredits(targetCredits: number): CreditEstimate | null {
  if (targetCredits <= 0) return null;

  let bestOption: CreditEstimate | null = null;
  for (const plan of CREDIT_PLANS) {
    const remainder = Math.max(0, targetCredits - plan.credits);
    const topups = minCostTopups(remainder);
    const option: CreditEstimate = {
      plan,
      topups: topups.breakdown,
      cost: plan.price + topups.cost,
      credits: plan.credits + topups.credits,
    };
    if (!bestOption || option.cost < bestOption.cost) bestOption = option;
  }
  return bestOption;
}

/** Dado un presupuesto, encuentra la combinación (1 plan + adicionales
 * opcionales) que maximiza los créditos sin excederlo. Devuelve null si el
 * presupuesto no alcanza ni para el plan más pequeño. */
export function estimateCreditsForBudget(budget: number): CreditEstimate | null {
  if (budget <= 0) return null;

  let bestOption: CreditEstimate | null = null;
  for (const plan of CREDIT_PLANS) {
    if (plan.price > budget) continue;
    const topups = maxCreditsForTopupBudget(budget - plan.price);
    const option: CreditEstimate = {
      plan,
      topups: topups.breakdown,
      credits: plan.credits + topups.credits,
      cost: plan.price + topups.cost,
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
