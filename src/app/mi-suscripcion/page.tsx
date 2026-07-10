import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getSubscriptionByEmail } from "@/lib/subscriptions";
import { CREDIT_PLANS, formatCOP } from "@/lib/credits-pricing";
import { cancelMySubscription, changeMyPlan } from "@/app/suscripcion/actions";

export default async function MiSuscripcionPage({
  searchParams,
}: {
  searchParams: Promise<{ requiere_plan?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/iniciar-sesion");

  const { requiere_plan } = await searchParams;
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  const subscription = email ? await getSubscriptionByEmail(email) : null;
  const plan = subscription ? CREDIT_PLANS.find((p) => p.id === subscription.plan) : null;
  const planSiguiente =
    subscription?.planSiguiente && CREDIT_PLANS.find((p) => p.id === subscription.planSiguiente);

  return (
    <section className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <h1 className="font-heading text-3xl font-bold text-move-green">Mi suscripción</h1>

      {requiere_plan && (!subscription || subscription.estado !== "Activa") && (
        <p className="mt-4 rounded-2xl border border-move-coral/30 bg-move-coral/5 p-4 font-body text-sm text-move-coral">
          Los créditos adicionales solo se pueden comprar con un plan activo. Suscríbete a un plan primero.
        </p>
      )}

      {!subscription || subscription.estado !== "Activa" ? (
        <div className="mt-8 rounded-2xl border border-move-green/10 bg-white p-6">
          <p className="font-body text-sm text-move-green/70">
            {subscription?.estado === "Cancelada"
              ? "Tu suscripción está cancelada. Tus créditos siguen disponibles hasta que venzan."
              : subscription?.estado === "Pago fallido"
                ? "No pudimos cobrar tu última renovación. Vuelve a suscribirte para seguir recibiendo créditos cada mes."
                : "Todavía no tienes una suscripción activa."}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {CREDIT_PLANS.map((p) => (
              <Link
                key={p.id}
                href={`/suscribirse/${p.id}`}
                className="rounded-full bg-move-coral px-5 py-2 font-heading text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                Suscribirme a {p.name} ({p.label})
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-8 space-y-6">
          <div className="rounded-2xl border border-move-green/10 bg-white p-6">
            <p className="font-heading text-lg font-semibold text-move-green">
              {plan ? `${plan.name} — ${plan.label}` : subscription.plan}
            </p>
            <p className="mt-1 font-body text-sm text-move-green/70">
              {plan ? `${formatCOP(plan.price)} al mes` : ""}
            </p>
            {subscription.proximoCobro && (
              <p className="mt-1 font-body text-sm text-move-green/60">
                Próximo cobro:{" "}
                {new Date(subscription.proximoCobro).toLocaleDateString("es-CO", {
                  timeZone: "America/Bogota",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            )}
            {planSiguiente && (
              <p className="mt-1 font-body text-xs font-medium uppercase tracking-wide text-move-coral">
                Cambia a {planSiguiente.name} ({planSiguiente.label}) en la próxima renovación
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-move-green/10 bg-white p-6">
            <p className="font-heading text-sm font-semibold text-move-green">Cambiar de plan</p>
            <p className="mt-1 font-body text-xs text-move-green/60">
              El cambio aplica en tu próxima renovación, no de inmediato.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              {CREDIT_PLANS.filter((p) => p.id !== subscription.plan).map((p) => (
                <form key={p.id} action={changeMyPlan.bind(null, p.id)}>
                  <button
                    type="submit"
                    className="rounded-full bg-move-green px-4 py-2 font-heading text-xs font-semibold text-white transition-opacity hover:opacity-90"
                  >
                    Cambiar a {p.name}
                  </button>
                </form>
              ))}
            </div>
          </div>

          <form action={cancelMySubscription}>
            <button
              type="submit"
              className="font-heading text-sm font-semibold text-move-coral hover:underline"
            >
              Cancelar suscripción
            </button>
          </form>
        </div>
      )}
    </section>
  );
}
