import { esNavidad } from "@/lib/credits-pricing";
import { FondoNavidad, CajaRegalo, Mono, PALETAS_REGALO } from "@/components/landing/navidad-decor";
import Image from "next/image";
import GiftForm from "./gift-form";

/** Página de la tarjeta de regalo (/regalar y /regalar/[planId]). En
 * temporada de Navidad la cabecera se llena de regalos y moños. */
export default function RegalarPage({ planInicial, error }: { planInicial: string; error?: string }) {
  const navidad = esNavidad();

  return (
    <>
      <section className="relative overflow-hidden bg-move-green text-white">
        {navidad && <FondoNavidad />}
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 md:py-20">
          <div>
            <span className="inline-flex rounded-full bg-move-coral px-4 py-1.5 font-heading text-xs font-bold uppercase tracking-widest">
              {navidad ? "🎄 Regalos de Navidad" : "Tarjeta de regalo"}
            </span>
            <h1 className="mt-5 font-heading text-4xl font-bold leading-tight sm:text-5xl">
              {navidad ? (
                <>
                  Esta Navidad, regala <span className="text-move-lime">UNIQUE</span>
                </>
              ) : (
                <>
                  Regala <span className="text-move-lime">UNIQUE</span>
                </>
              )}
            </h1>
            <p className="mt-4 max-w-md font-body text-lg text-white/75">
              Uno, dos o tres meses de clases en los mejores gimnasios y experiencias wellness. Virtual al correo, o
              física en una tarjeta que llevamos hasta su puerta en Bogotá.
            </p>
          </div>

          <div className="relative mx-auto w-full max-w-md">
            {navidad && (
              <>
                <Mono className="absolute -right-4 -top-10 z-20 h-20 w-28 rotate-12" />
                <CajaRegalo className="absolute -bottom-8 -left-8 z-20 h-24 w-24 -rotate-6" colores={PALETAS_REGALO[1]} />
                <CajaRegalo className="absolute -bottom-6 -right-6 z-20 h-20 w-20 rotate-6" colores={PALETAS_REGALO[2]} />
              </>
            )}
            {/* La tarjeta tal cual está diseñada en Canva (exportada en alta
                resolución): el frente doblado y, encima, el interior abierto. */}
            <div className="relative z-0 w-[78%] -rotate-3 overflow-hidden rounded-md shadow-[0_35px_60px_-15px_rgba(0,0,0,0.6)] ring-1 ring-white/20">
              <Image
                src="/regalos/tarjeta-frente-hd.png"
                alt="Tarjeta de regalo UNIQUE"
                width={1697}
                height={1200}
                sizes="(min-width: 768px) 350px, 72vw"
                quality={95}
                priority
                className="w-full"
              />
              {/* borde coral del interior asomando, como en la tarjeta real */}
              <div className="absolute inset-x-0 bottom-0 h-[4%] bg-move-coral" />
            </div>
            <div className="relative z-10 -mt-[14%] ml-auto w-[40%] rotate-[5deg] overflow-hidden rounded-md shadow-[0_35px_60px_-15px_rgba(0,0,0,0.6)]">
              <Image
                src="/regalos/tarjeta-interior-hd.png"
                alt="Interior de la tarjeta de regalo UNIQUE"
                width={1697}
                height={2400}
                sizes="(min-width: 768px) 190px, 40vw"
                quality={95}
                className="w-full"
              />
              {/* sombra suave del doblez en la mitad */}
              <div className="absolute inset-x-0 top-1/2 h-[10%] -translate-y-1/2 bg-gradient-to-b from-transparent via-black/10 to-transparent" />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-move-green/[0.03]">
        <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
          <div className="rounded-3xl border border-move-green/10 bg-white p-6 shadow-sm sm:p-10">
            <GiftForm planInicial={planInicial} error={error} />
          </div>
        </div>
      </section>
    </>
  );
}
