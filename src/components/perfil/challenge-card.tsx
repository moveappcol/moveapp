import Link from "next/link";
import { fechaLargaChallenge, type EstadoChallenge } from "@/lib/challenge";

function ChuloDorado() {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[radial-gradient(circle_at_35%_30%,#fff3c4,#f7d774_35%,#c9962b_80%)] shadow-[0_0_0_2px_rgba(255,224,138,0.35),0_4px_14px_rgba(247,215,116,0.45)]">
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden="true">
        <path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="#063009" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

/** Tarjeta del Challenge UNIQUE (mismo diseño que en la app): las 4 barras
 * con su chulo dorado, el círculo del regalo que se llena, y el pase de
 * clase gratis cuando lo gana. */
export default function ChallengeCard({ estado }: { estado: EstadoChallenge }) {
  if (!estado.disponible) return null;
  const pct = Math.round((estado.completados / 4) * 100);

  return (
    <div className="relative overflow-hidden rounded-3xl bg-move-green p-6 text-white">
      <p className="font-serif text-4xl font-extrabold tracking-wide text-move-coral">CHALLENGE</p>
      <p className="mt-1 font-body text-sm text-white/70">
        {estado.lanzado
          ? "Completa los 4 retos y gana una clase gratis donde quieras."
          : "Arranca el lunes 24 de noviembre: completa los 4 retos y gana una clase gratis."}
      </p>

      {estado.pase && (
        <div className="mt-5 rounded-2xl bg-gradient-to-br from-[#fff7d6] to-[#ffe9a6] p-5 text-center text-move-green">
          <p className="text-4xl">🎁</p>
          <p className="mt-1 font-heading text-xl font-extrabold">¡Ganaste una clase gratis!</p>
          <p className="mt-1 font-body text-sm text-move-green/70">
            Úsala en la clase que quieras, en cualquier gimnasio. No gasta tus créditos.
          </p>
          <span className="mt-3 inline-block rounded-full bg-move-green px-3 py-1 font-heading text-xs font-bold text-move-lime">
            ⏳ Vence el {fechaLargaChallenge(estado.pase.fechaVence)}
          </span>
          <Link
            href="/#gimnasios"
            className="mt-4 block rounded-full bg-move-coral px-5 py-3 font-heading text-sm font-bold text-white"
          >
            Reservar mi clase gratis
          </Link>
        </div>
      )}

      <div className="mt-5 flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-3">
        <div
          className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full"
          style={{ background: `conic-gradient(#D4FF3F 0 ${pct}%, rgba(255,255,255,0.15) ${pct}% 100%)` }}
        >
          <div className="absolute inset-2 flex flex-col items-center justify-center rounded-full bg-white">
            <span className="text-2xl leading-none">🎁</span>
            <span className="font-heading text-[11px] font-extrabold text-move-green">{estado.completados} de 4</span>
          </div>
        </div>
        <div>
          <p className="font-heading text-base font-extrabold leading-tight">Te ganas una clase con UNIQUE</p>
          <p className="font-body text-xs text-white/60">
            {estado.congelado
              ? "Tu challenge está en pausa: renueva tu plan para seguir avanzando."
              : estado.completados === 4
                ? "¡Completado!"
                : `Te ${4 - estado.completados === 1 ? "falta 1 reto" : `faltan ${4 - estado.completados} retos`}`}
          </p>
        </div>
      </div>

      <ul className="mt-2 space-y-4">
        {estado.retos.map((r) => (
          <li key={r.id}>
            <p className="font-heading text-sm font-bold">{r.titulo}</p>
            <div className="mt-2 flex items-center gap-3">
              <div className="relative h-4 flex-1 overflow-hidden rounded-full bg-white/15">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#ff7a6d] to-move-coral"
                  style={{ width: `${Math.max(r.actual === 0 ? 4 : 0, (r.actual / r.meta) * 100)}%` }}
                />
              </div>
              {r.completado ? (
                <ChuloDorado />
              ) : (
                <span className="h-9 w-9 shrink-0 rounded-full border-2 border-dashed border-white/25" />
              )}
            </div>
            {r.meta > 1 && (
              <div className="mt-1 flex justify-between pr-12 font-heading text-xs font-extrabold">
                {Array.from({ length: r.meta }, (_, i) => (
                  <span key={i} className={i < r.actual ? "text-move-lime" : "text-white/30"}>
                    {i + 1}
                  </span>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>

      {estado.pista && estado.lanzado && (
        <p className="mt-5 rounded-xl bg-move-lime px-3 py-2 font-heading text-sm font-bold text-move-green">
          {estado.pista}
        </p>
      )}
      <p className="mt-4 font-body text-xs text-white/50">
        Cuentan las clases que reservas y no cancelas, desde que arranca tu ronda. Al completar los 4 retos, el challenge
        vuelve a empezar.
      </p>
    </div>
  );
}
