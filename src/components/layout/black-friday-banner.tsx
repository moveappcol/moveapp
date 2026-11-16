import Link from "next/link";
import { esBlackFriday, CREDIT_PLANS, bonoBlackFridayPorcentaje, creditosCompraPlan } from "@/lib/credits-pricing";

/** Globo rojo con brillo — decoración del banner (mismo look del arte de
 * Black Friday: globos rojos sobre verde UNIQUE). */
function Globo({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 60 80" className={className} aria-hidden="true">
      <defs>
        <radialGradient id="bf-globo" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#ff5a5f" />
          <stop offset="60%" stopColor="#d81f2c" />
          <stop offset="100%" stopColor="#9e0f1c" />
        </radialGradient>
      </defs>
      <ellipse cx="30" cy="32" rx="26" ry="31" fill="url(#bf-globo)" />
      <ellipse cx="21" cy="20" rx="6" ry="9" fill="#fff" opacity="0.18" />
      <path d="M26 62 L34 62 L30 67 Z" fill="#b5141f" />
    </svg>
  );
}

function Bolsa({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 50 60" className={className} aria-hidden="true">
      <path d="M4 14 L46 14 L46 58 L4 58 Z" fill="#3d3d3d" />
      <path d="M4 14 L46 14 L42 8 L8 8 Z" fill="#e3342f" />
      <path d="M17 20 C17 34 33 34 33 20" stroke="#e3342f" strokeWidth="2.5" fill="none" />
    </svg>
  );
}

/** Franja de Black Friday arriba de todas las páginas, solo el 20 y 21 de
 * nov (ver BLACK_FRIDAY). Se evalúa en cada request (el layout ya es
 * dinámico por el idioma), así que aparece y desaparece sola a medianoche
 * hora Colombia sin desplegar nada. */
export default function BlackFridayBanner() {
  if (!esBlackFriday()) return null;

  const starter = CREDIT_PLANS[0];

  return (
    <section className="relative overflow-hidden bg-move-green text-white">
      {/* Cinta diagonal en la esquina, como el arte */}
      <div className="pointer-events-none absolute -left-14 top-10 hidden w-72 -rotate-45 bg-move-coral py-1.5 text-center font-heading text-sm font-extrabold uppercase tracking-wider text-white shadow-lg sm:block">
        Black Friday
      </div>

      <div className="pointer-events-none absolute right-0 top-2 hidden h-full w-40 md:block">
        <Globo className="absolute right-20 top-2 h-16 w-12 rotate-[-8deg]" />
        <Globo className="absolute right-8 top-0 h-20 w-16 rotate-6" />
        <Globo className="absolute right-0 top-14 h-14 w-11 rotate-12" />
      </div>
      <div className="pointer-events-none absolute bottom-0 right-28 hidden gap-1 md:flex">
        <Bolsa className="h-10 w-8" />
        <Bolsa className="h-14 w-11" />
      </div>

      <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 py-5 text-center sm:px-6 md:px-40">
        <p className="font-heading text-xs font-bold uppercase tracking-[0.2em] text-move-lime">
          <span className="sm:hidden">Black Friday · </span>Solo 20 y 21 de noviembre
        </p>
        <h2 className="font-heading text-xl font-extrabold leading-tight sm:text-2xl">
          Aprovecha esta oferta: <span className="text-move-coral">ocurre una vez al año</span>
        </h2>
        <div className="flex flex-wrap justify-center gap-2 font-body text-sm">
          <span className="rounded-full bg-move-coral px-3 py-1 font-heading font-bold">
            Starter: +{bonoBlackFridayPorcentaje(starter.id)}% créditos ({starter.credits} → {creditosCompraPlan(starter)})
          </span>
          <span className="rounded-full bg-white/10 px-3 py-1 font-heading font-semibold">
            Balance y Volume: +15% créditos
          </span>
        </div>
        <Link
          href="/#planes"
          className="rounded-full bg-move-lime px-6 py-2 font-heading text-sm font-bold text-move-green transition-opacity hover:opacity-90"
        >
          Quiero mis créditos extra
        </Link>
      </div>
    </section>
  );
}
