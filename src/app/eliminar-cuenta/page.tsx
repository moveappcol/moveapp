import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-8">
      <h2 className="font-heading text-lg font-semibold text-move-green">{title}</h2>
      <div className="mt-2 space-y-3 font-body text-sm leading-relaxed text-move-green/80">{children}</div>
    </div>
  );
}

export default async function EliminarCuentaPage() {
  const t = getDictionary(await getLocale()).eliminarCuenta;

  return (
    <section className="mx-auto max-w-2xl px-4 py-20 sm:px-6">
      <p className="font-body text-xs uppercase tracking-wide text-move-green/50">{t.eyebrow}</p>
      <h1 className="mt-2 font-heading text-3xl font-bold text-move-green">{t.title}</h1>
      <p className="mt-4 font-body text-sm leading-relaxed text-move-green/80">{t.intro}</p>

      <Section title={t.s1Title}>
        <p>
          {t.s1P1Before}{" "}
          <a href="mailto:gerencia@uniqueappcol.com" className="text-move-coral underline">
            gerencia@uniqueappcol.com
          </a>{" "}
          {t.s1P1After}
        </p>
        <p>{t.s1P2}</p>
      </Section>

      <Section title={t.s2Title}>
        <p>{t.s2P1}</p>
      </Section>

      <Section title={t.s3Title}>
        <p>{t.s3P1}</p>
      </Section>

      <Section title={t.s4Title}>
        <p>
          {t.s4P1Before}{" "}
          <a href="mailto:gerencia@uniqueappcol.com" className="text-move-coral underline">
            gerencia@uniqueappcol.com
          </a>
          , {t.s4P1After}
        </p>
      </Section>

      <p className="mt-8 font-body text-xs text-move-green/50">
        {t.footerBefore}{" "}
        <a href="/tratamiento-datos" className="text-move-coral underline">
          {t.footerLink}
        </a>
        .
      </p>
    </section>
  );
}
