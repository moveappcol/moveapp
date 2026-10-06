import Link from "next/link";
import { getGyms, esGimnasioDeExperiencias } from "@/lib/gyms";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";

/** Tarjeta con foto real debajo del Hero, para que "Experiencias" (el
 * gimnasio especial donde UNIQUE publica sus propios eventos — ver
 * esGimnasioDeExperiencias en gyms.ts) no quede escondida dentro de la
 * grilla normal de gimnasios. Si ese gimnasio todavía no existe en Airtable
 * o no tiene foto cargada, no se muestra nada — nunca a medio armar. */
export default async function ExperiencesTeaser() {
  const { gyms } = await getGyms();
  const gym = gyms.find((g) => esGimnasioDeExperiencias(g.name));
  if (!gym || !gym.photoUrl) return null;

  const locale = await getLocale();
  const t = getDictionary(locale).home.experiencesTeaser;

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Link
        href={`/gimnasios/${gym.id}`}
        className="group grid overflow-hidden rounded-3xl border border-move-green/10 bg-white transition-shadow hover:shadow-lg sm:grid-cols-2"
      >
        <div className="aspect-[16/9] sm:aspect-auto">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={gym.photoUrl}
            alt={t.eyebrow}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
        <div className="flex flex-col justify-center p-8">
          <span className="w-fit rounded-full bg-move-lime/40 px-3 py-1 font-heading text-xs font-semibold uppercase tracking-wide text-move-green">
            {t.eyebrow}
          </span>
          <h3 className="mt-4 font-heading text-2xl font-bold text-move-green">{t.title}</h3>
          <p className="mt-2 font-body text-move-green/70">{t.body}</p>
          <span className="mt-6 inline-flex w-fit items-center gap-1 rounded-full bg-move-coral px-5 py-2.5 font-heading text-sm font-semibold text-white transition-opacity group-hover:opacity-90">
            {t.cta}
            <svg viewBox="0 0 24 24" className="h-3 w-3 fill-none stroke-current stroke-[3]">
              <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </div>
      </Link>
    </section>
  );
}
