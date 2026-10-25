import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { TRIAL_PLAN, TRIAL_DURATION_DAYS, formatCOP } from "@/lib/credits-pricing";
import { fetchAcceptanceTokens, wompiPublicKey } from "@/lib/wompi";
import { requireCompleteProfileIfSignedIn } from "@/lib/perfil";
import { esElegibleParaPrueba } from "@/lib/pruebas";
import { getUserCreditsByEmail } from "@/lib/users";
import TrialCheckoutForm from "@/components/pagos/trial-checkout-form";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";

function calcularFechaFinEstimada(locale: "es" | "en"): string {
  const fechaFin = new Date(Date.now() + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000);
  return fechaFin.toLocaleDateString(locale === "en" ? "en-US" : "es-CO", {
    timeZone: "America/Bogota",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Checkout de la Prueba UNIQUE de 1 semana — espejo de
 * /suscribirse/[planId], pero con el chequeo de elegibilidad (correo +
 * teléfono, ver esElegibleParaPrueba) antes de mostrar el formulario: si no
 * es elegible, no se muestra la opción de compra en absoluto. */
export default async function PruebaPage() {
  const { userId } = await auth();
  if (!userId) redirect("/iniciar-sesion");
  await requireCompleteProfileIfSignedIn();

  const locale = await getLocale();
  const t = getDictionary(locale).pagos;

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const account = email ? await getUserCreditsByEmail(email) : null;
  const elegibilidad = await esElegibleParaPrueba(email, account?.telefono ?? null);

  if (!elegibilidad.ok) {
    return (
      <section className="mx-auto max-w-lg px-4 py-16 text-center sm:px-6">
        <h1 className="font-heading text-2xl font-bold text-move-green">{t.trial.noElegibleTitle}</h1>
        <p className="mt-2 font-body text-sm text-move-green/70">{t.trial.noElegibleMessage}</p>
        <Link
          href="/#planes"
          className="mt-6 inline-block rounded-full bg-move-coral px-6 py-3 font-heading text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          {t.trial.verPlanes}
        </Link>
      </section>
    );
  }

  const tokens = await fetchAcceptanceTokens();
  const fechaFinEstimada = calcularFechaFinEstimada(locale);

  return (
    <section className="mx-auto max-w-lg px-4 py-16 sm:px-6">
      <h1 className="font-heading text-2xl font-bold text-move-green">{t.trial.title}</h1>
      <p className="mt-2 font-body text-sm text-move-green/70">{t.trial.subtitle(formatCOP(TRIAL_PLAN.price))}</p>

      <div className="mt-8">
        <TrialCheckoutForm
          fechaFinEstimada={fechaFinEstimada}
          publicKey={wompiPublicKey()}
          permalinkAcceptance={tokens.permalinkAcceptance}
          permalinkPersonalAuth={tokens.permalinkPersonalAuth}
          locale={locale}
        />
      </div>
    </section>
  );
}
