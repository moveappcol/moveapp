"use client";

import { useActionState } from "react";
import Link from "next/link";
import { saveCompletarPerfil } from "@/app/completar-perfil/actions";
import { TIPOS_DOCUMENTO, GENEROS } from "@/lib/documento";
import type { Dictionary } from "@/lib/i18n/dictionaries";

const inputClass =
  "mt-2 w-full rounded-xl border border-move-green/20 px-4 py-3 font-body text-move-green outline-none focus:border-move-coral";
const labelClass = "font-heading text-sm font-medium text-move-green";

/** "YYYY-MM-DD" de hace 18 años, para no dejar elegir una fecha que ya de
 * entrada no cumpliría la edad mínima. La validación real es del servidor. */
function maxBirthDate(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 18);
  return d.toISOString().slice(0, 10);
}

export default function CompletarPerfilForm({
  defaultNombre,
  defaultApellido,
  t,
}: {
  defaultNombre: string;
  defaultApellido: string;
  t: Dictionary["completarPerfil"]["form"];
}) {
  const [state, formAction, isPending] = useActionState<{ error: string } | null, FormData>(
    saveCompletarPerfil,
    null
  );

  return (
    <form action={formAction} className="space-y-4">
      <label className="block">
        <span className={labelClass}>{t.nombre}</span>
        <input type="text" name="nombre" required defaultValue={defaultNombre} className={inputClass} />
      </label>

      <label className="block">
        <span className={labelClass}>{t.apellido}</span>
        <input type="text" name="apellido" required defaultValue={defaultApellido} className={inputClass} />
      </label>

      <label className="block">
        <span className={labelClass}>{t.telefono}</span>
        <input type="tel" name="telefono" required inputMode="tel" className={inputClass} />
      </label>

      <label className="block">
        <span className={labelClass}>{t.tipoDocumento}</span>
        <select name="tipoDocumento" required defaultValue="" className={inputClass}>
          <option value="" disabled>
            {t.selectTipo}
          </option>
          {TIPOS_DOCUMENTO.map((tipo) => (
            <option key={tipo} value={tipo}>
              {tipo}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className={labelClass}>{t.numeroDocumento}</span>
        <input type="text" name="cedula" required inputMode="text" className={inputClass} />
      </label>

      <label className="block">
        <span className={labelClass}>{t.fechaNacimiento}</span>
        <input type="date" name="fechaNacimiento" required max={maxBirthDate()} className={inputClass} />
        <span className="mt-1 block font-body text-xs text-move-green/60">{t.soloMayores}</span>
      </label>

      <label className="block">
        <span className={labelClass}>{t.genero}</span>
        <select name="genero" required defaultValue="" className={inputClass}>
          <option value="" disabled>
            {t.selectOpcion}
          </option>
          {GENEROS.map((genero) => (
            <option key={genero} value={genero}>
              {genero}
            </option>
          ))}
        </select>
      </label>

      <div className="space-y-3 pt-2">
        <label className="flex items-start gap-2">
          <input type="checkbox" name="tratamientoDatosAceptado" required className="mt-1" />
          <span className="font-body text-sm text-move-green/80">
            {t.tratamientoBefore}{" "}
            <Link href="/tratamiento-datos" target="_blank" className="text-move-coral underline">
              {t.tratamientoLink}
            </Link>{" "}
            {t.tratamientoAfter}
          </span>
        </label>

        <label className="flex items-start gap-2">
          <input type="checkbox" name="terminosAceptados" required className="mt-1" />
          <span className="font-body text-sm text-move-green/80">
            {t.terminosBefore}{" "}
            <Link href="/terminos" target="_blank" className="text-move-coral underline">
              {t.terminosLink}
            </Link>{" "}
            {t.terminosAfter}
          </span>
        </label>

        <label className="flex items-start gap-2">
          <input type="checkbox" name="marketingAceptado" className="mt-1" />
          <span className="font-body text-sm text-move-green/80">{t.marketing}</span>
        </label>
      </div>

      {state?.error && <p className="font-body text-sm text-move-coral">{state.error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-full bg-move-coral px-6 py-3 font-heading text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? t.guardando : t.continuar}
      </button>
    </form>
  );
}
