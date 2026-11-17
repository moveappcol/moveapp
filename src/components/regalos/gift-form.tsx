"use client";

import { useState } from "react";
import {
  CREDIT_PLANS,
  MESES_REGALO,
  PRECIO_ENVIO_REGALO_FISICO,
  CIUDAD_REGALO_FISICO,
  formatCOP,
} from "@/lib/credits-pricing";
import { startGiftCheckout } from "@/app/regalar/actions";

const inputClass =
  "mt-1 w-full rounded-xl border border-move-green/20 bg-white px-4 py-3 font-body text-sm text-move-green outline-none focus:border-move-coral";

function Opcion({
  activa,
  onClick,
  children,
}: {
  activa: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border px-4 py-3 text-left transition-colors ${
        activa ? "border-move-coral bg-move-coral/5 ring-1 ring-move-coral" : "border-move-green/15 bg-white"
      }`}
    >
      {children}
    </button>
  );
}

/** Formulario de la tarjeta de regalo: plan, meses (1 a 3), virtual o
 * física (+envío, solo Bogotá) y lo que va escrito en la tarjeta. El precio
 * se muestra acá solo como guía — el que se cobra lo recalcula el servidor
 * desde el itemId (ver findRegaloItem en orders.ts). */
export default function GiftForm({ planInicial, error }: { planInicial: string; error?: string }) {
  const [planId, setPlanId] = useState(
    CREDIT_PLANS.some((p) => p.id === planInicial) ? planInicial : CREDIT_PLANS[0].id
  );
  const [meses, setMeses] = useState<number>(1);
  const [tipo, setTipo] = useState<"virtual" | "fisica">("virtual");

  const plan = CREDIT_PLANS.find((p) => p.id === planId)!;
  const subtotal = plan.price * meses;
  const total = subtotal + (tipo === "fisica" ? PRECIO_ENVIO_REGALO_FISICO : 0);

  return (
    <form action={startGiftCheckout} className="space-y-8">
      <input type="hidden" name="planId" value={planId} />
      <input type="hidden" name="meses" value={meses} />
      <input type="hidden" name="tipo" value={tipo} />

      <div>
        <p className="font-heading text-sm font-semibold text-move-green">1. ¿Qué plan quieres regalar?</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {CREDIT_PLANS.map((p) => (
            <Opcion key={p.id} activa={p.id === planId} onClick={() => setPlanId(p.id)}>
              <p className="font-heading text-xs font-bold uppercase tracking-wide text-move-coral">{p.name}</p>
              <p className="font-heading text-sm font-semibold text-move-green">{p.label} al mes</p>
              <p className="font-body text-xs text-move-green/60">{formatCOP(p.price)} / mes</p>
            </Opcion>
          ))}
        </div>
      </div>

      <div>
        <p className="font-heading text-sm font-semibold text-move-green">2. ¿Cuántos meses?</p>
        <div className="mt-3 grid grid-cols-3 gap-3">
          {MESES_REGALO.map((m) => (
            <Opcion key={m} activa={m === meses} onClick={() => setMeses(m)}>
              <p className="font-heading text-lg font-bold text-move-green">{m === 1 ? "1 mes" : `${m} meses`}</p>
              <p className="font-body text-xs text-move-green/60">{formatCOP(plan.price * m)}</p>
            </Opcion>
          ))}
        </div>
        {meses > 1 && (
          <p className="mt-2 font-body text-xs text-move-green/60">
            Quien lo reciba tiene {plan.credits} créditos cada mes, durante {meses} meses.
          </p>
        )}
      </div>

      <div>
        <p className="font-heading text-sm font-semibold text-move-green">3. ¿Cómo la quieres?</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Opcion activa={tipo === "virtual"} onClick={() => setTipo("virtual")}>
            <p className="font-heading text-sm font-bold text-move-green">💌 Virtual</p>
            <p className="font-body text-xs text-move-green/60">Te llega al correo para enviarla o imprimirla. Sin costo extra.</p>
          </Opcion>
          <Opcion activa={tipo === "fisica"} onClick={() => setTipo("fisica")}>
            <p className="font-heading text-sm font-bold text-move-green">🎁 Física</p>
            <p className="font-body text-xs text-move-green/60">
              Se la llevamos a la puerta. +{formatCOP(PRECIO_ENVIO_REGALO_FISICO)} de envío, solo en {CIUDAD_REGALO_FISICO}.
            </p>
          </Opcion>
        </div>
      </div>

      <div className="space-y-4">
        <p className="font-heading text-sm font-semibold text-move-green">4. La tarjeta</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="font-heading text-sm font-medium text-move-green">Para</span>
            <input type="text" name="para" required placeholder="¿Para quién es?" className={inputClass} />
          </label>
          <label className="block">
            <span className="font-heading text-sm font-medium text-move-green">De parte de</span>
            <input type="text" name="deParte" required placeholder="¿De parte de quién?" className={inputClass} />
          </label>
        </div>

        {tipo === "fisica" && (
          <div className="space-y-4 rounded-2xl border border-move-green/10 bg-move-green/[0.03] p-4">
            <label className="block">
              <span className="font-heading text-sm font-medium text-move-green">Ciudad</span>
              <select name="ciudad" defaultValue={CIUDAD_REGALO_FISICO} className={inputClass}>
                <option value={CIUDAD_REGALO_FISICO}>{CIUDAD_REGALO_FISICO}</option>
              </select>
              <span className="mt-1 block font-body text-xs text-move-green/50">
                Por ahora solo hacemos entregas dentro de {CIUDAD_REGALO_FISICO}.
              </span>
            </label>
            <label className="block">
              <span className="font-heading text-sm font-medium text-move-green">Dirección de entrega</span>
              <input type="text" name="direccion" required placeholder="Calle, número, apto, barrio" className={inputClass} />
            </label>
            <label className="block">
              <span className="font-heading text-sm font-medium text-move-green">Celular para coordinar la entrega</span>
              <input type="tel" name="celular" required placeholder="300 123 4567" className={inputClass} />
            </label>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <p className="font-heading text-sm font-semibold text-move-green">5. Tus datos</p>
        <label className="block">
          <span className="font-heading text-sm font-medium text-move-green">Tu nombre</span>
          <input type="text" name="nombre" required className={inputClass} />
        </label>
        <label className="block">
          <span className="font-heading text-sm font-medium text-move-green">Tu correo</span>
          <input type="email" name="correo" required className={inputClass} />
          <span className="mt-1 block font-body text-xs text-move-green/50">
            Ahí te mandamos el código del regalo. No necesitas crear una cuenta.
          </span>
        </label>
      </div>

      <div className="rounded-2xl bg-move-green p-5 text-white">
        <div className="flex justify-between font-body text-sm text-white/80">
          <span>
            Plan {plan.name} × {meses === 1 ? "1 mes" : `${meses} meses`}
          </span>
          <span>{formatCOP(subtotal)}</span>
        </div>
        {tipo === "fisica" && (
          <div className="mt-1 flex justify-between font-body text-sm text-white/80">
            <span>Tarjeta física y envío</span>
            <span>{formatCOP(PRECIO_ENVIO_REGALO_FISICO)}</span>
          </div>
        )}
        <div className="mt-3 flex justify-between border-t border-white/15 pt-3 font-heading text-lg font-bold">
          <span>Total</span>
          <span className="text-move-lime">{formatCOP(total)}</span>
        </div>
      </div>

      {error && <p className="font-body text-sm text-move-coral">{error}</p>}

      <button
        type="submit"
        className="w-full rounded-full bg-move-coral px-6 py-3.5 font-heading text-sm font-semibold text-white transition-opacity hover:opacity-90"
      >
        Pagar {formatCOP(total)}
      </button>
      <p className="text-center font-body text-xs text-move-green/50">
        Quien lo reciba tiene 3 meses para activarlo, desde la app o en uniqueappcol.com/canjear.
      </p>
    </form>
  );
}
