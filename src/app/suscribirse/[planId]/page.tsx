import crypto from "node:crypto";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { findCatalogItem } from "@/lib/orders";
import { formatCOP } from "@/lib/credits-pricing";
import { fetchAcceptanceTokens, wompiPublicKey } from "@/lib/wompi";
import { requireCompleteProfileIfSignedIn } from "@/lib/perfil";
import { getSubscriptionByEmail } from "@/lib/subscriptions";
import SubscribeForm from "@/components/pagos/subscribe-form";
import CheckoutViewTracker from "@/components/analytics/checkout-view-tracker";
import { COUPON_COOKIE_NAME } from "@/components/landing/coupon-capture";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getMetaRequestContext } from "@/lib/meta-request-context";
import { sendMetaInitiateCheckoutEvent } from "@/lib/meta-conversions-api";

/** Cupón que se intenta aplicar por defecto a cualquier persona que llegue
 * al checkout, sin necesidad de un link de campaña — mientras siga activo
 * en Airtable. Un ?cupon= capturado de la URL (ver coupon-capture.tsx)
 * tiene prioridad sobre este default. */
const DEFAULT_COUPON_CODE = "UNIQUE1";

export default async function SuscribirsePage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = await params;
  const { userId } = await auth();
  if (!userId) redirect(`/iniciar-sesion`);
  await requireCompleteProfileIfSignedIn();

  const locale = await getLocale();
  const t = getDictionary(locale).pagos;

  const plan = findCatalogItem("plan", planId);
  if (!plan) notFound();

  // Un correo, un plan a la vez — si ya tiene uno activo, esta pantalla no
  // es el camino (eso es "Cambiar de plan" en Mi suscripción); si se llega
  // igual (link viejo, doble clic, reintento), la acción del formulario
  // también lo bloquea, esto solo evita mostrar el formulario de una vez.
  const clerkUser = await currentUser();
  const email = clerkUser?.primaryEmailAddress?.emailAddress;
  if (email) {
    const existingSubscription = await getSubscriptionByEmail(email);
    if (existingSubscription && existingSubscription.estado === "Activa") {
      redirect("/mi-suscripcion");
    }
  }

  const tokens = await fetchAcceptanceTokens();
  const cookieStore = await cookies();
  const initialCouponCode = cookieStore.get(COUPON_COOKIE_NAME)?.value || DEFAULT_COUPON_CODE;

  const checkoutEventId = crypto.randomUUID();
  const metaContext = await getMetaRequestContext();
  await sendMetaInitiateCheckoutEvent({
    eventId: checkoutEventId,
    value: plan.price,
    contentId: plan.id,
    contentName: plan.name ?? plan.label,
    email,
    ...metaContext,
  });

  return (
    <section className="mx-auto max-w-lg px-4 py-16 sm:px-6">
      <CheckoutViewTracker
        planId={plan.id}
        planName={plan.name ?? plan.label}
        value={plan.price}
        eventId={checkoutEventId}
      />
      <h1 className="font-heading text-2xl font-bold text-move-green">
        {t.subscribe.title(plan.name ?? "", plan.label)}
      </h1>
      <p className="mt-2 font-body text-sm text-move-green/70">
        {t.subscribe.subtitle(formatCOP(plan.price))}
      </p>
      <p className="mt-2 font-body text-xs text-move-green/50">{t.subscribe.limiteMensual}</p>

      <div className="mt-8">
        <SubscribeForm
          planId={plan.id}
          planPrice={plan.price}
          publicKey={wompiPublicKey()}
          permalinkAcceptance={tokens.permalinkAcceptance}
          permalinkPersonalAuth={tokens.permalinkPersonalAuth}
          initialCouponCode={initialCouponCode}
          locale={locale}
        />
      </div>
    </section>
  );
}
