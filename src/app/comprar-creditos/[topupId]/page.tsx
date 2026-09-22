import { notFound, redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { findCatalogItem } from "@/lib/orders";
import { formatCOP } from "@/lib/credits-pricing";
import { fetchAcceptanceTokens, wompiPublicKey } from "@/lib/wompi";
import { requireCompleteProfileIfSignedIn } from "@/lib/perfil";
import { getSubscriptionByEmail } from "@/lib/subscriptions";
import BuyTopupForm from "@/components/pagos/buy-topup-form";
import CheckoutViewTracker from "@/components/analytics/checkout-view-tracker";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";

export default async function ComprarCreditosPage({
  params,
}: {
  params: Promise<{ topupId: string }>;
}) {
  const { topupId } = await params;
  const { userId } = await auth();
  if (!userId) redirect("/iniciar-sesion");
  await requireCompleteProfileIfSignedIn();

  const locale = await getLocale();
  const t = getDictionary(locale).pagos;

  const topup = findCatalogItem("topup", topupId);
  if (!topup) notFound();

  // Los adicionales solo se compran con un plan activo — si no lo tiene,
  // no hay nada que hacer en esta pantalla.
  const clerkUser = await currentUser();
  const email = clerkUser?.primaryEmailAddress?.emailAddress;
  const subscription = email ? await getSubscriptionByEmail(email) : null;
  if (!subscription || subscription.estado !== "Activa") {
    redirect("/mi-suscripcion?requiere_plan=1");
  }

  const tokens = await fetchAcceptanceTokens();

  return (
    <section className="mx-auto max-w-lg px-4 py-16 sm:px-6">
      <CheckoutViewTracker planId={topup.id} planName={topup.label} value={topup.price} />
      <h1 className="font-heading text-2xl font-bold text-move-green">{t.topup.comprar(topup.label)}</h1>
      <p className="mt-2 font-body text-sm text-move-green/70">{t.topup.subtitle(formatCOP(topup.price))}</p>

      <div className="mt-8">
        <BuyTopupForm
          topupId={topup.id}
          topupPrice={topup.price}
          publicKey={wompiPublicKey()}
          permalinkAcceptance={tokens.permalinkAcceptance}
          permalinkPersonalAuth={tokens.permalinkPersonalAuth}
          locale={locale}
        />
      </div>
    </section>
  );
}
