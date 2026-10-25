import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { formatCOP, PRECIO_CREDITO_SUELTO, MINIMO_CREDITOS_SUELTOS } from "@/lib/credits-pricing";
import { fetchAcceptanceTokens, wompiPublicKey } from "@/lib/wompi";
import { requireCompleteProfileIfSignedIn } from "@/lib/perfil";
import BuyCreditosSueltosForm from "@/components/pagos/buy-creditos-sueltos-form";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";

/** Compra de créditos sueltos, sin plan — para quien solo quiere probar una
 * clase o experiencia puntual (ver chargeCreditosSueltos en billing.ts).
 * A diferencia de /comprar-creditos/[topupId], no exige ninguna suscripción
 * activa. */
export default async function CreditosSueltosPage() {
  const { userId } = await auth();
  if (!userId) redirect("/iniciar-sesion");
  await requireCompleteProfileIfSignedIn();

  const locale = await getLocale();
  const t = getDictionary(locale).pagos;
  const tokens = await fetchAcceptanceTokens();

  return (
    <section className="mx-auto max-w-lg px-4 py-16 sm:px-6">
      <h1 className="font-heading text-2xl font-bold text-move-green">{t.creditosSueltos.title}</h1>
      <p className="mt-2 font-body text-sm text-move-green/70">
        {t.creditosSueltos.subtitle(formatCOP(PRECIO_CREDITO_SUELTO), MINIMO_CREDITOS_SUELTOS)}
      </p>

      <div className="mt-8">
        <BuyCreditosSueltosForm
          publicKey={wompiPublicKey()}
          permalinkAcceptance={tokens.permalinkAcceptance}
          permalinkPersonalAuth={tokens.permalinkPersonalAuth}
          locale={locale}
        />
      </div>
    </section>
  );
}
