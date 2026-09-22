"use client";

import { useActionState } from "react";
import { sendGymApplication } from "@/app/contacto/actions";
import type { ContactResult } from "@/app/contacto/actions";
import type { Dictionary } from "@/lib/i18n/dictionaries";

const inputClass =
  "mt-2 w-full rounded-xl border border-move-green/20 px-4 py-3 font-body text-move-green outline-none focus:border-move-coral";
const labelClass = "font-heading text-sm font-medium text-move-green";

export default function GymApplicationForm({ t }: { t: Dictionary["home"]["contact"]["gymForm"] }) {
  const [state, formAction, isPending] = useActionState<ContactResult | null, FormData>(
    sendGymApplication,
    null
  );

  if (state?.ok) {
    return (
      <p className="rounded-2xl border border-move-green/10 bg-white p-6 font-body text-sm font-medium text-move-green">
        {t.gracias}
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-4 rounded-2xl border border-move-green/10 bg-white p-6">
      <label className="block">
        <span className={labelClass}>{t.nombreGimnasio}</span>
        <input type="text" name="nombre" required className={inputClass} />
      </label>

      <label className="block">
        <span className={labelClass}>{t.direccion}</span>
        <input type="text" name="direccion" required className={inputClass} />
      </label>

      <label className="block">
        <span className={labelClass}>{t.ciudad}</span>
        <input type="text" name="ciudad" required className={inputClass} />
      </label>

      <label className="block">
        <span className={labelClass}>{t.instagram}</span>
        <input type="text" name="instagram" placeholder="@tugimnasio" className={inputClass} />
      </label>

      <label className="block">
        <span className={labelClass}>{t.disciplina}</span>
        <input
          type="text"
          name="disciplina"
          required
          placeholder={t.disciplinaPlaceholder}
          className={inputClass}
        />
      </label>

      <label className="block">
        <span className={labelClass}>{t.descripcion}</span>
        <textarea name="descripcion" required rows={4} className={inputClass} />
      </label>

      <label className="block">
        <span className={labelClass}>{t.correoContacto}</span>
        <input type="email" name="correo" required className={inputClass} />
      </label>

      {state && !state.ok && <p className="font-body text-sm text-move-coral">{state.error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-full bg-move-coral px-6 py-3 font-heading text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? t.enviando : t.enviarSolicitud}
      </button>
    </form>
  );
}
