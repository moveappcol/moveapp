import Link from "next/link";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";

/** Franja angosta justo debajo del Hero — a propósito no compite con los
 * CTAs del Hero (ya tiene varios) ni requiere saber si hay sesión iniciada
 * o cuál es el código de cada quien: solo avisa que el programa existe y
 * manda a Mi Suscripción, que ya hace el trabajo de mostrar/generar el
 * código real (ver mi-suscripcion/page.tsx). */
export default async function ReferralBanner() {
  const locale = await getLocale();
  const t = getDictionary(locale).home.referral;

  return (
    <section className="border-y border-move-coral/20 bg-move-coral/5">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <p className="font-body text-sm text-move-green">
          <span className="font-heading font-bold">{t.title}</span>{" "}
          <span className="text-move-green/70">{t.body}</span>
        </p>
        <Link
          href="/mi-suscripcion"
          className="shrink-0 rounded-full bg-move-coral px-5 py-2 font-heading text-xs font-semibold text-white transition-opacity hover:opacity-90"
        >
          {t.cta}
        </Link>
      </div>
    </section>
  );
}
