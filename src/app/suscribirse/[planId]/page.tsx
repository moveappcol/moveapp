import { notFound, redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { findCatalogItem } from "@/lib/orders";
import { formatCOP } from "@/lib/credits-pricing";
import { fetchAcceptanceTokens, wompiPublicKey } from "@/lib/wompi";
import SubscribeForm from "@/components/pagos/subscribe-form";

export default async function SuscribirsePage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = await params;
  const { userId } = await auth();
  if (!userId) redirect(`/iniciar-sesion`);

  const plan = findCatalogItem("plan", planId);
  if (!plan) notFound();

  const tokens = await fetchAcceptanceTokens();

  return (
    <section className="mx-auto max-w-lg px-4 py-16 sm:px-6">
      <h1 className="font-heading text-2xl font-bold text-move-green">
        Suscribirme a {plan.label}
      </h1>
      <p className="mt-2 font-body text-sm text-move-green/70">
        {formatCOP(plan.price)} al mes · se cobra automáticamente cada mes a
        la misma tarjeta hasta que canceles. Puedes cancelar o cambiar de
        plan cuando quieras desde &ldquo;Mi suscripción&rdquo;.
      </p>

      <div className="mt-8">
        <SubscribeForm
          planId={plan.id}
          planLabel={plan.label}
          publicKey={wompiPublicKey()}
          permalinkAcceptance={tokens.permalinkAcceptance}
          permalinkPersonalAuth={tokens.permalinkPersonalAuth}
        />
      </div>
    </section>
  );
}
