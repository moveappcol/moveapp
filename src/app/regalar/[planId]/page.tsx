import { notFound } from "next/navigation";
import { findCatalogItem } from "@/lib/orders";
import { formatCOP } from "@/lib/credits-pricing";
import { startGiftCheckout } from "../actions";

export default async function RegalarPlanPage({
  params,
  searchParams,
}: {
  params: Promise<{ planId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { planId } = await params;
  const { error } = await searchParams;
  const plan = findCatalogItem("regalo", planId);
  if (!plan) notFound();

  return (
    <section className="mx-auto max-w-lg px-4 py-16 sm:px-6">
      <h1 className="font-heading text-2xl font-bold text-move-green">
        Regala un plan {plan.name ?? ""}
      </h1>
      <p className="mt-2 font-body text-sm text-move-green/70">
        {plan.label} — {formatCOP(plan.price)}. No necesitas crear una cuenta para regalarlo:
        pagas, te llega un código por correo, y quien lo reciba lo activa cuando quiera (tiene 3
        meses).
      </p>

      <form action={startGiftCheckout.bind(null, planId)} className="mt-8 space-y-4">
        <label className="block">
          <span className="font-heading text-sm font-medium text-move-green">Tu nombre</span>
          <input
            type="text"
            name="nombre"
            required
            className="mt-1 w-full rounded-xl border border-move-green/20 px-4 py-3 font-body text-sm text-move-green outline-none focus:border-move-coral"
          />
        </label>
        <label className="block">
          <span className="font-heading text-sm font-medium text-move-green">Tu correo</span>
          <input
            type="email"
            name="correo"
            required
            className="mt-1 w-full rounded-xl border border-move-green/20 px-4 py-3 font-body text-sm text-move-green outline-none focus:border-move-coral"
          />
          <span className="mt-1 block font-body text-xs text-move-green/50">
            Ahí te mandamos el código de tu regalo — puedes reenviárselo a quien quieras después.
          </span>
        </label>

        {error === "datos" && (
          <p className="font-body text-sm text-move-coral">
            Revisa tu nombre y correo antes de continuar.
          </p>
        )}

        <button
          type="submit"
          className="w-full rounded-full bg-move-coral px-6 py-3 font-heading text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          Pagar {formatCOP(plan.price)}
        </button>
      </form>
    </section>
  );
}
