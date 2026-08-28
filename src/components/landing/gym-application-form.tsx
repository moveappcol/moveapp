"use client";

import { useActionState } from "react";
import { sendGymApplication } from "@/app/contacto/actions";
import type { ContactResult } from "@/app/contacto/actions";

const inputClass =
  "mt-2 w-full rounded-xl border border-move-green/20 px-4 py-3 font-body text-move-green outline-none focus:border-move-coral";
const labelClass = "font-heading text-sm font-medium text-move-green";

export default function GymApplicationForm() {
  const [state, formAction, isPending] = useActionState<ContactResult | null, FormData>(
    sendGymApplication,
    null
  );

  if (state?.ok) {
    return (
      <p className="rounded-2xl border border-move-green/10 bg-white p-6 font-body text-sm font-medium text-move-green">
        ¡Gracias! Recibimos la información de tu gimnasio y te contactamos pronto.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-4 rounded-2xl border border-move-green/10 bg-white p-6">
      <label className="block">
        <span className={labelClass}>Nombre del gimnasio</span>
        <input type="text" name="nombre" required className={inputClass} />
      </label>

      <label className="block">
        <span className={labelClass}>Dirección</span>
        <input type="text" name="direccion" required className={inputClass} />
      </label>

      <label className="block">
        <span className={labelClass}>Ciudad</span>
        <input type="text" name="ciudad" required className={inputClass} />
      </label>

      <label className="block">
        <span className={labelClass}>Instagram</span>
        <input type="text" name="instagram" placeholder="@tugimnasio" className={inputClass} />
      </label>

      <label className="block">
        <span className={labelClass}>¿Qué disciplina(s) manejan?</span>
        <input type="text" name="disciplina" required placeholder="Ej. Boxeo, Yoga, Crossfit…" className={inputClass} />
      </label>

      <label className="block">
        <span className={labelClass}>Cuéntanos brevemente sobre el lugar</span>
        <textarea name="descripcion" required rows={4} className={inputClass} />
      </label>

      <label className="block">
        <span className={labelClass}>Correo de contacto</span>
        <input type="email" name="correo" required className={inputClass} />
      </label>

      {state && !state.ok && <p className="font-body text-sm text-move-coral">{state.error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-full bg-move-coral px-6 py-3 font-heading text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? "Enviando…" : "Enviar solicitud"}
      </button>
    </form>
  );
}
