import Image from "next/image";

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-background">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 md:grid-cols-2 md:items-center md:py-28">
        <div>
          <span className="inline-flex items-center rounded-full bg-move-lime/40 px-4 py-1 font-heading text-xs font-semibold uppercase tracking-wide text-move-green">
            Un solo plan, todos los gimnasios
          </span>
          <h1 className="mt-6 font-heading text-4xl font-bold leading-tight text-move-green sm:text-5xl">
            Entrena donde quieras,
            <br />
            cuando quieras.
          </h1>
          <p className="mt-5 max-w-md font-body text-lg text-move-green/70">
            Con un plan de créditos <span className="font-brand text-move-green">UNIQUE</span> accedes a
            cycling, boxing, yoga y muchas más disciplinas en los mejores
            gimnasios y estudios afiliados, sin ataduras a uno solo.
          </p>
          {/* Anchors nativos a propósito: los links de sección deben
              recargar y hacer scroll de forma confiable en todos los
              navegadores, sin depender del scroll-restoration de Next. */}
          <div className="mt-8 flex flex-wrap gap-4">
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/#planes"
              className="rounded-full bg-move-coral px-6 py-3 font-heading text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              Ver planes de créditos
            </a>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/#gimnasios"
              className="rounded-full border border-move-green/20 px-6 py-3 font-heading text-sm font-semibold text-move-green transition-colors hover:border-move-green"
            >
              Explorar gimnasios
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
