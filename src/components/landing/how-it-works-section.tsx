import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";

export default async function HowItWorksSection() {
  const locale = await getLocale();
  const t = getDictionary(locale).home.howItWorks;
  const STEPS = [
    { n: 1, title: t.step1Title, body: t.step1Body },
    { n: 2, title: t.step2Title, body: t.step2Body },
    { n: 3, title: t.step3Title, body: t.step3Body },
    { n: 4, title: t.step4Title, body: t.step4Body },
  ];

  return (
    <section id="como-funciona" className="bg-background">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="max-w-2xl">
          <h2 className="font-heading text-3xl font-bold text-move-green">{t.title}</h2>
          <p className="mt-2 font-body text-move-green/70">{t.subtitle}</p>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step) => (
            <div
              key={step.n}
              className="rounded-3xl border border-move-green/10 bg-white p-6"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-move-coral font-heading text-sm font-bold text-white">
                {step.n}
              </span>
              <h3 className="mt-4 font-heading text-base font-bold text-move-green">
                {step.title}
              </h3>
              <p className="mt-2 font-body text-sm leading-relaxed text-move-green/70">
                {step.body}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-8">
          <a
            href="/como-funciona"
            className="inline-flex items-center gap-2 rounded-full bg-move-green px-6 py-3 font-heading text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            {t.cta}
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-white stroke-[2.4]">
              <path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}
