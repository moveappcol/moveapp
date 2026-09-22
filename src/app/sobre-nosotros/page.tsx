import Link from "next/link";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";

export default async function SobreNosotrosPage() {
  const t = getDictionary(await getLocale()).sobreNosotros;

  return (
    <section className="mx-auto max-w-2xl px-4 py-20 sm:px-6">
      <p className="font-body text-xs uppercase tracking-wide text-move-green/50">{t.eyebrow}</p>
      <h1 className="mt-2 font-heading text-3xl font-bold text-move-green">{t.title}</h1>

      <div className="mt-4 space-y-4 font-body text-sm leading-relaxed text-move-green/80">
        <p>{t.p1}</p>
        <p>{t.p2}</p>
        <p>{t.p3}</p>
        <p>{t.p4}</p>
      </div>

      <div className="mt-10 rounded-3xl bg-move-green/[0.04] p-6">
        <p className="font-body text-sm leading-relaxed text-move-green/80">
          {t.calloutBefore}{" "}
          <Link href="/como-funciona" className="font-semibold text-move-coral underline">
            {t.calloutLink}
          </Link>
          {t.calloutAfter}
        </p>
      </div>
    </section>
  );
}
