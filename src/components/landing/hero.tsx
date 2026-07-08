import Image from "next/image";
import Link from "next/link";

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
            Con un plan de créditos <span className="font-brand text-move-green">MOVE</span> accedes a
            cycling, boxing, yoga y muchas más disciplinas en los mejores
            gimnasios y estudios afiliados, sin ataduras a uno solo.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/#planes"
              className="rounded-full bg-move-coral px-6 py-3 font-heading text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              Ver planes de créditos
            </Link>
            <Link
              href="/#gimnasios"
              className="rounded-full border border-move-green/20 px-6 py-3 font-heading text-sm font-semibold text-move-green transition-colors hover:border-move-green"
            >
              Explorar gimnasios
            </Link>
          </div>
        </div>

        <div className="relative aspect-square w-full max-w-md justify-self-center overflow-hidden rounded-[2.5rem] bg-move-coral md:justify-self-end">
          <Image
            src="/brand/move-logo-source.png"
            alt="MOVE"
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
