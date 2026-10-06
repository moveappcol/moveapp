import { CREDIT_PLANS, ahorroPorcentaje } from "@/lib/credits-pricing";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";

/** Franja angosta, literal lo primero que se ve de la página (antes del
 * Hero) — el gancho más fuerte posible: el % de ahorro del plan que más
 * ahorra (Volume) frente a pagar cada clase suelta en el gimnasio. El % de
 * cada plan específico sale después, en su propia tarjeta en la sección de
 * Planes (ver PRECIO_CLASE_SUELTA_POR_CREDITO en credits-pricing.ts para la
 * referencia de precio usada). */
export default async function SavingsBar() {
  const locale = await getLocale();
  const t = getDictionary(locale).home.savingsBar;
  const mejorAhorro = Math.max(...CREDIT_PLANS.map(ahorroPorcentaje));

  return (
    <div className="bg-move-green py-2.5 text-center">
      <p className="font-heading text-xs font-semibold uppercase tracking-wide text-white sm:text-sm">
        {t.text(mejorAhorro)}
      </p>
    </div>
  );
}
