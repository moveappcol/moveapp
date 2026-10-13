"use client";

import { useActionState, useEffect, useState } from "react";
import { agregarClase } from "./actions";
import type { ClaseTemplate, CrearClaseResult } from "@/lib/classes";

export default function NuevaClase({
  templates,
  onCreada,
}: {
  templates: ClaseTemplate[];
  onCreada: () => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [state, formAction, isPending] = useActionState<CrearClaseResult | null, FormData>(
    agregarClase,
    null
  );

  // Igual que en EliminarClase: sin esto, la clase recién creada no
  // aparecía en la lista hasta el próximo refresco automático (cada 20s).
  useEffect(() => {
    if (state?.ok === true) onCreada();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="rounded-full border border-move-green/20 px-4 py-2 font-heading text-xs font-semibold text-move-green transition-colors hover:border-move-green"
      >
        + Agregar clase
      </button>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="rounded-2xl border border-move-green/10 bg-white p-5">
        <p className="font-heading text-sm font-semibold text-move-green">Agregar clase</p>
        <p className="mt-2 font-body text-sm text-move-green/60">
          Todavía no tienes ninguna clase cargada para elegir — escríbenos a{" "}
          <a href="mailto:gerencia@uniqueappcol.com" className="text-move-coral underline">
            gerencia@uniqueappcol.com
          </a>{" "}
          para que te ayudemos a crear la primera. Después de eso, podrás usar sus horarios y
          cupos como base para armar las siguientes clases tú mismo.
        </p>
        <button
          type="button"
          onClick={() => setAbierto(false)}
          className="mt-3 font-heading text-xs font-semibold text-move-green/60 hover:text-move-green"
        >
          Cerrar
        </button>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="rounded-2xl border border-move-green/10 bg-white p-5"
    >
      <p className="font-heading text-sm font-semibold text-move-green">Agregar clase</p>
      <p className="mt-1 font-body text-xs text-move-green/60">
        Elige una de tus clases y arma un horario nuevo. El nombre, los créditos y los demás
        datos se copian solos — solo eliges fecha, hora y cupos.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="font-body text-xs font-semibold text-move-green/70">Clase</span>
          <select
            name="templateId"
            required
            defaultValue=""
            className="rounded-lg border border-move-green/20 px-3 py-2 font-body text-sm text-move-green outline-none focus:border-move-coral"
          >
            <option value="" disabled>
              Elige una clase...
            </option>
            {templates.map((t) => (
              <option key={t.templateId} value={t.templateId}>
                {t.name} ({t.credits} créditos)
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="font-body text-xs font-semibold text-move-green/70">Cupos</span>
          <input
            type="number"
            name="cupos"
            min={0}
            step={1}
            required
            defaultValue={1}
            className="rounded-lg border border-move-green/20 px-3 py-2 font-body text-sm text-move-green outline-none focus:border-move-coral"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="font-body text-xs font-semibold text-move-green/70">Fecha</span>
          <input
            type="date"
            name="fecha"
            required
            className="rounded-lg border border-move-green/20 px-3 py-2 font-body text-sm text-move-green outline-none focus:border-move-coral"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="font-body text-xs font-semibold text-move-green/70">Hora</span>
          <input
            type="time"
            name="hora"
            required
            className="rounded-lg border border-move-green/20 px-3 py-2 font-body text-sm text-move-green outline-none focus:border-move-coral"
          />
        </label>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-full bg-move-green px-4 py-2 font-heading text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? "Creando..." : "Crear clase"}
        </button>
        <button
          type="button"
          onClick={() => setAbierto(false)}
          className="font-heading text-xs font-semibold text-move-green/60 hover:text-move-green"
        >
          Cancelar
        </button>
        {state?.ok === false && <span className="font-body text-xs text-move-coral">{state.error}</span>}
        {state?.ok === true && (
          <span className="font-body text-xs font-semibold text-emerald-600">Clase creada ✓</span>
        )}
      </div>
    </form>
  );
}
