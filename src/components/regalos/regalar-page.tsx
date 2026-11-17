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
            {/* Fotos reales de la tarjeta impresa, recortadas sin fondo */}
            <Image
              src="/regalos/tarjeta-frente.png"
              alt="Tarjeta de regalo UNIQUE"
              width={2611}
              height={1840}
              sizes="(min-width: 768px) 340px, 75vw"
              quality={92}
              priority
              className="relative z-0 w-[76%] -rotate-3 drop-shadow-[0_30px_35px_rgba(0,0,0,0.45)]"
            />
            <Image
              src="/regalos/tarjeta-interior.png"
              alt="Interior de la tarjeta de regalo UNIQUE"
              width={2722}
              height={1935}
              sizes="(min-width: 768px) 300px, 68vw"
              quality={92}
              className="relative z-10 -mt-[22%] ml-auto w-[68%] rotate-3 drop-shadow-[0_30px_35px_rgba(0,0,0,0.45)]"
            />
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
