import Image from "next/image";
import InstallAppButton from "./install-app-button";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { validateCoupon, DEFAULT_COUPON_CODE } from "@/lib/cupones";
import { esBlackFriday } from "@/lib/credits-pricing";
import { Globo, Bolsa } from "./black-friday-decor";

export default async function Hero() {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const t = dict.home.hero;

  // Mismo cupón que se valida en plans-section.tsx y en el checkout — se
  // repite acá (no se comparte el resultado entre componentes de la misma
  // página) para que este letrero desaparezca solo apenas el cupón se
  // desactive o venza en Airtable, sin tocar código ni dejarlo vivo de más.
  const descuentoResult = await validateCoupon(DEFAULT_COUPON_CODE);
  const mostrarDescuentoBadge = descuentoResult.ok && descuentoResult.cupon.tipo === "Descuento";
  // 20 y 21 de nov: el hero se viste de Black Friday (fondo verde, globos,
  // sello de créditos extra) — vuelve solo a la normalidad después.
  const bf = esBlackFriday();

  return (
    <section className={`relative overflow-hidden ${bf ? "bg-move-green" : "bg-background"}`}>
      {bf && (
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <Globo className="absolute left-[3%] top-10 hidden h-20 w-16 -rotate-12 lg:block" />
          <Globo className="absolute left-[7%] top-24 hidden h-14 w-11 rotate-6 lg:block" />
          <Globo className="absolute right-[4%] top-6 h-16 w-12 rotate-12 sm:h-24 sm:w-20" />
          <Globo className="absolute right-[9%] top-16 hidden h-16 w-12 -rotate-6 sm:block" />
          <div className="absolute bottom-6 left-[4%] hidden gap-1 lg:flex">
            <Bolsa className="h-14 w-11" />
            <Bolsa className="h-20 w-16" />
          </div>
        </div>
      )}
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 md:grid-cols-2 md:items-center md:py-28">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            {bf ? (
              <span className="inline-flex items-center rounded-full bg-move-coral px-5 py-2 font-heading text-base font-extrabold uppercase tracking-widest text-white sm:text-lg">
                Black Friday · 20 y 21 de nov
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-move-lime/40 px-4 py-1 font-heading text-xs font-semibold uppercase tracking-wide text-move-green">
                {t.badge}
              </span>
            )}
            {mostrarDescuentoBadge && (
              <span className="inline-flex items-center rounded-full bg-move-coral px-4 py-1 font-heading text-xs font-semibold uppercase tracking-wide text-white">
                {t.discountBadge}
              </span>
            )}
          </div>
          <h1 className={`mt-6 font-heading text-4xl font-bold leading-tight sm:text-5xl ${bf ? "text-white" : "text-move-green"}`}>
            {t.titleLine1}
            <br />
            {t.titleLine2}
          </h1>
          {bf && (
            <p className="mt-4 font-heading text-2xl font-extrabold leading-snug text-move-lime sm:text-3xl">
              Hasta +20% de créditos en tu plan.
            </p>
          )}
          <p className={`mt-5 max-w-md font-body text-lg ${bf ? "text-white/75" : "text-move-green/70"}`}>
            {(() => {
              const [before, after] = t.body.split("UNIQUE");
              return (
                <>
                  {before}
                  <span className={`font-brand ${bf ? "text-white" : "text-move-green"}`}>UNIQUE</span>
                  {after}
                </>
              );
            })()}
          </p>
          {/* Anchors nativos a propósito: los links de sección deben
              recargar y hacer scroll de forma confiable en todos los
              navegadores, sin depender del scroll-restoration de Next. */}
          <div className="mt-8 flex flex-wrap gap-4">
            <InstallAppButton label={dict.install.downloadApp} sobreVerde={bf} />
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/#planes"
              className={`rounded-full px-6 py-3 font-heading text-sm font-semibold transition-opacity hover:opacity-90 ${
                bf ? "bg-move-lime text-move-green" : "bg-move-coral text-white"
              }`}
            >
              {bf ? "Quiero mis créditos extra" : t.ctaPlanes}
            </a>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/#gimnasios"
              className={`rounded-full border px-6 py-3 font-heading text-sm font-semibold transition-colors ${
                bf
                  ? "border-white/30 text-white hover:border-white"
                  : "border-move-green/20 text-move-green hover:border-move-green"
              }`}
            >
              {t.ctaGimnasios}
            </a>
          </div>
        </div>

        <div className="relative aspect-square w-full max-w-md justify-self-center overflow-hidden rounded-[2.5rem] bg-move-coral md:justify-self-end">
          <Image
            src="/brand/unique-logo-source.png"
            alt="UNIQUE"
            fill
            sizes="(min-width: 768px) 28rem, 90vw"
            className="object-contain p-10"
            priority
          />
          <div className="absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-move-lime" />
          {bf && (
            <>
              <div className="absolute -left-24 top-10 w-[24rem] -rotate-45 bg-move-green py-2.5 text-center font-heading text-xl font-extrabold uppercase tracking-widest text-white shadow-lg">
                Black Friday
              </div>
              <div className="absolute bottom-6 right-6 flex h-28 w-28 rotate-12 flex-col items-center justify-center rounded-full bg-move-lime text-center font-heading leading-none text-move-green shadow-xl">
                <span className="text-3xl font-extrabold">+20%</span>
                <span className="mt-1 text-[11px] font-bold uppercase">créditos</span>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
