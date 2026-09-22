import type { Metadata } from "next";
import Link from "next/link";
import { CREDIT_PLANS, CREDIT_TOPUPS, formatCOP } from "@/lib/credits-pricing";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";

export const metadata: Metadata = {
  title: "¿Cómo funciona UNIQUE?",
  description:
    "Todo lo que necesitas saber sobre los planes de créditos de UNIQUE: cómo elegir un plan, cómo reservar clases, cancelaciones y más.",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-14">
      <h2 className="font-heading text-xl font-bold text-move-green">{title}</h2>
      <div className="mt-3 space-y-3 font-body text-sm leading-relaxed text-move-green/80">
        {children}
      </div>
    </div>
  );
}

export default async function ComoFuncionaPage() {
  const t = getDictionary(await getLocale()).comoFunciona;

  const STEPS = [
    { n: 1, title: t.step1Title, body: [t.step1P1, t.step1P2] },
    { n: 2, title: t.step2Title, body: [t.step2P1] },
    { n: 3, title: t.step3Title, body: [t.step3P1, t.step3P2] },
    { n: 4, title: t.step4Title, body: [t.step4P1] },
  ];

  return (
    <section className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
      <p className="font-body text-xs uppercase tracking-wide text-move-green/50">{t.eyebrow}</p>
      <h1 className="mt-2 font-heading text-3xl font-bold text-move-green sm:text-4xl">{t.title}</h1>
      <p className="mt-4 max-w-xl font-body text-move-green/70">{t.intro}</p>

      <div className="mt-12 space-y-6">
        {STEPS.map((step) => (
          <div
            key={step.n}
            className="flex gap-5 rounded-3xl border border-move-green/10 bg-white p-6 sm:p-8"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-move-coral font-heading text-sm font-bold text-white">
              {step.n}
            </span>
            <div>
              <h3 className="font-heading text-lg font-bold text-move-green">{step.title}</h3>
              <div className="mt-2 space-y-2 font-body text-sm leading-relaxed text-move-green/80">
                {step.body.map((p) => (
                  <p key={p}>{p}</p>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <Section title={t.planesTitle}>
        <div className="grid gap-4 sm:grid-cols-3">
          {CREDIT_PLANS.map((plan) => (
            <div
              key={plan.id}
              className="rounded-2xl border border-move-green/10 bg-white p-5 text-center"
            >
              <p className="font-heading text-sm font-semibold uppercase tracking-wide text-move-coral">
                {plan.name}
              </p>
              <p className="mt-1 font-heading text-2xl font-bold text-move-green">
                {t.creditosLabel(plan.credits)}
              </p>
              <p className="mt-1 font-body text-xs text-move-green/60">{t.alMes}</p>
              <p className="mt-3 font-heading text-sm font-semibold text-move-green">
                {formatCOP(plan.price)}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-4">
          {t.topupsIntro}{" "}
          {CREDIT_TOPUPS.map((tp, i) => (
            <span key={tp.id}>
              {i > 0 && " · "}
              {t.creditosLabel(tp.credits)} ({formatCOP(tp.price)})
            </span>
          ))}
          .
        </p>
      </Section>

      <Section title={t.cancelacionesTitle}>
        <p>{t.cancelacionesP1}</p>
        <p>{t.cancelacionesP2}</p>
      </Section>

      <Section title={t.permanenciaTitle}>
        <p>{t.permanenciaP1}</p>
      </Section>

      <Section title={t.pagosTitle}>
        <p>{t.pagosP1}</p>
      </Section>

      <Section title={t.faqTitle}>
        <div className="space-y-3">
          {t.faqs.map((item) => (
            <details
              key={item.q}
              className="group overflow-hidden rounded-2xl bg-move-green open:bg-white open:shadow-md open:ring-1 open:ring-move-green/10 transition-colors"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-heading text-sm font-semibold text-white marker:content-none group-open:text-move-green">
                {item.q}
                <span className="shrink-0 font-body text-xl leading-none text-move-lime transition-transform duration-200 group-open:rotate-45 group-open:text-move-coral">
                  +
                </span>
              </summary>
              <p className="px-5 pb-5 font-body text-sm leading-relaxed text-move-green/80">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </Section>

      <div className="mt-14 flex flex-col items-start gap-4 rounded-3xl bg-move-green px-8 py-8 text-white sm:flex-row sm:items-center sm:justify-between">
        <p className="font-heading text-lg font-bold">{t.ctaTitle}</p>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a
          href="/#planes"
          className="shrink-0 rounded-full bg-move-coral px-6 py-3 font-heading text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          {t.ctaButton}
        </a>
      </div>

      <p className="mt-8 font-body text-xs text-move-green/50">
        {t.dudasBefore}{" "}
        <Link href="/#contacto" className="underline hover:text-move-coral">
          {t.dudasLink}
        </Link>
        .
      </p>
    </section>
  );
}
