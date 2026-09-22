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

export default async function TratamientoDatosPage() {
  const locale = await getLocale();
  const t = getDictionary(locale).tratamientoDatos;

  return (
    <section className="mx-auto max-w-2xl px-4 py-20 sm:px-6">
      {locale === "en" && (
        <p className="mb-6 rounded-xl border border-move-coral/30 bg-move-coral/5 p-4 font-body text-xs leading-relaxed text-move-coral">
          {t.draftNotice}
        </p>
      )}
      <p className="font-body text-xs uppercase tracking-wide text-move-green/50">{t.eyebrow}</p>
      <h1 className="mt-2 font-heading text-3xl font-bold text-move-green">{t.title}</h1>
      <p className="mt-4 font-body text-sm leading-relaxed text-move-green/80">{t.intro}</p>

      {t.sections.map((section) => (
        <Section key={section.title} title={section.title}>
          {section.paragraphs.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </Section>
      ))}
    </section>
  );
}
