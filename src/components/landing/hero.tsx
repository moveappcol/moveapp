import Image from "next/image";
import InstallAppButton from "./install-app-button";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";

export default async function Hero() {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const t = dict.home.hero;

  return (
    <section className="relative overflow-hidden bg-background">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 md:grid-cols-2 md:items-center md:py-28">
        <div>
          <span className="inline-flex items-center rounded-full bg-move-lime/40 px-4 py-1 font-heading text-xs font-semibold uppercase tracking-wide text-move-green">
            {t.badge}
          </span>
          <h1 className="mt-6 font-heading text-4xl font-bold leading-tight text-move-green sm:text-5xl">
            {t.titleLine1}
            <br />
            {t.titleLine2}
          </h1>
          <p className="mt-5 max-w-md font-body text-lg text-move-green/70">
            {(() => {
              const [before, after] = t.body.split("UNIQUE");
              return (
                <>
                  {before}
                  <span className="font-brand text-move-green">UNIQUE</span>
                  {after}
                </>
              );
            })()}
          </p>
          {/* Anchors nativos a propósito: los links de sección deben
              recargar y hacer scroll de forma confiable en todos los
              navegadores, sin depender del scroll-restoration de Next. */}
          <div className="mt-8 flex flex-wrap gap-4">
            <InstallAppButton label={dict.install.downloadApp} />
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/#planes"
              className="rounded-full bg-move-coral px-6 py-3 font-heading text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              {t.ctaPlanes}
            </a>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/#gimnasios"
              className="rounded-full border border-move-green/20 px-6 py-3 font-heading text-sm font-semibold text-move-green transition-colors hover:border-move-green"
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
        </div>
      </div>
    </section>
  );
}
