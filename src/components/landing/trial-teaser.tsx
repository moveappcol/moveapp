import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";

export default async function TrialTeaser() {
  const { userId } = await auth();
  const locale = await getLocale();
  const t = getDictionary(locale).home.plans;

  return (
    <section className="mx-auto max-w-6xl px-4 pt-10 sm:px-6">
      <div className="relative overflow-hidden rounded-3xl bg-move-green px-6 py-8 sm:px-10 sm:py-10">
        <span className="absolute -right-10 top-6 w-40 rotate-45 bg-move-lime py-1.5 text-center font-heading text-xs font-extrabold uppercase tracking-widest text-move-green">
          {t.trialBadge}
        </span>
        <div className="max-w-xl">
          <h2 className="font-heading text-2xl font-bold text-white sm:text-3xl">
            {t.trialTitle}
          </h2>
          <p className="mt-2 font-body text-white/75">{t.trialBody}</p>
          <Link
            href={userId ? "/prueba" : "/crear-cuenta"}
            className="mt-5 inline-block rounded-full bg-move-coral px-6 py-3 font-heading text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            {t.trialCta}
          </Link>
        </div>
      </div>
    </section>
  );
}
