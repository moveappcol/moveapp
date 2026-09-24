"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { precioEfectivo, type Clase } from "@/lib/classes";
import {
  DAY_KEY_FORMATTER,
  semanaActual,
  formatHora,
  bogotaHour,
  formatRangoHorario,
  RANGOS_HORARIO,
} from "@/lib/dias";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/locale";

export type GymInfo = { name: string; activities: string[] };

export default function ClassesByDayExplorer({
  classes,
  gymsById,
  reservedClaseIds,
  locale,
  t,
}: {
  classes: Clase[];
  gymsById: Record<string, GymInfo>;
  reservedClaseIds?: string[];
  locale: Locale;
  t: Dictionary["home"]["gyms"];
}) {
  const semana = useMemo(() => semanaActual(locale), [locale]);
  const [diaSeleccionado, setDiaSeleccionado] = useState(() => semana[0].key);
  const [actividadSeleccionada, setActividadSeleccionada] = useState<string | null>(null);
  const [rangoSeleccionado, setRangoSeleccionado] = useState<string | null>(null);
  const reservedSet = useMemo(() => new Set(reservedClaseIds ?? []), [reservedClaseIds]);

  // Las opciones incluyen tanto las actividades ya puestas por clase como
  // las de los gimnasios (para las clases que el staff todavía no
  // clasificó individualmente) — así el chip no desaparece mientras se
  // va llenando el dato nuevo.
  const activityOptions = useMemo(
    () =>
      Array.from(
        new Set([
          ...classes.map((c) => c.actividad).filter((a): a is string => a !== null),
          ...Object.values(gymsById).flatMap((g) => g.activities),
        ])
      ).sort(),
    [classes, gymsById]
  );

  const diaActivo = semana.find((d) => d.key === diaSeleccionado) ?? semana[0];
  const rangoActivo = RANGOS_HORARIO.find((r) => r.key === rangoSeleccionado) ?? null;

  const clasesDelDia = classes
    .filter((c) => {
      if (!c.fecha) return false;
      if (DAY_KEY_FORMATTER.format(new Date(c.fecha)) !== diaActivo.key) return false;

      // Las clases sin cupo nunca se muestran en este explorador — salvo
      // que sea una clase que la propia persona ya reservó (su reserva no
      // debe desaparecer solo porque el cupo se llenó después).
      if (!reservedSet.has(c.id) && c.cuposDisponibles <= 0) return false;

      const gym = c.gimnasioId ? gymsById[c.gimnasioId] : undefined;
      if (actividadSeleccionada) {
        // Si la clase ya tiene su propia actividad puesta, se compara
        // exacto contra esa — más preciso que las actividades generales
        // del gimnasio. Solo cae al gimnasio si todavía no se clasificó.
        const coincide = c.actividad
          ? c.actividad === actividadSeleccionada
          : (gym?.activities.includes(actividadSeleccionada) ?? false);
        if (!coincide) return false;
      }

      if (rangoActivo) {
        const hora = bogotaHour(c.fecha);
        if (hora < rangoActivo.startHour || hora >= rangoActivo.endHour) return false;
      }

      return true;
    })
    .sort((a, b) => (a.fecha ?? "").localeCompare(b.fecha ?? ""));

  return (
    <div className="mt-8 space-y-6">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {semana.map((dia) => (
          <button
            key={dia.key}
            type="button"
            onClick={() => setDiaSeleccionado(dia.key)}
            className={`flex shrink-0 flex-col items-center rounded-2xl px-3 py-2 font-heading transition ${
              diaSeleccionado === dia.key
                ? "bg-move-green text-white"
                : "bg-move-green/5 text-move-green/70 hover:bg-move-green/10"
            }`}
          >
            <span className="text-xs font-semibold uppercase tracking-wide">
              {dia.label.slice(0, 3)}
            </span>
            <span className="mt-0.5 text-[11px] opacity-80">{dia.fechaLabel}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActividadSeleccionada(null)}
          className={`rounded-full border px-4 py-2 font-heading text-xs font-medium transition-colors ${
            actividadSeleccionada === null
              ? "border-move-coral bg-move-coral text-white"
              : "border-move-green/15 text-move-green/60 hover:border-move-green/40"
          }`}
        >
          {t.todasLasActividades}
        </button>
        {activityOptions.map((activity) => {
          const active = actividadSeleccionada === activity;
          return (
            <button
              key={activity}
              type="button"
              onClick={() => setActividadSeleccionada(active ? null : activity)}
              className={`rounded-full border px-4 py-2 font-heading text-xs font-medium transition-colors ${
                active
                  ? "border-move-coral bg-move-coral text-white"
                  : "border-move-green/15 text-move-green/60 hover:border-move-green/40"
              }`}
            >
              {activity}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setRangoSeleccionado(null)}
          className={`rounded-full border px-4 py-2 font-heading text-xs font-medium transition-colors ${
            rangoSeleccionado === null
              ? "border-move-green bg-move-green text-white"
              : "border-move-green/15 text-move-green/60 hover:border-move-green/40"
          }`}
        >
          {t.todosLosHorarios}
        </button>
        {RANGOS_HORARIO.map((rango) => {
          const active = rangoSeleccionado === rango.key;
          return (
            <button
              key={rango.key}
              type="button"
              onClick={() => setRangoSeleccionado(active ? null : rango.key)}
              className={`rounded-full border px-4 py-2 font-heading text-xs font-medium transition-colors ${
                active
                  ? "border-move-green bg-move-green text-white"
                  : "border-move-green/15 text-move-green/60 hover:border-move-green/40"
              }`}
            >
              {formatRangoHorario(rango, locale)}
            </button>
          );
        })}
      </div>

      <div className="space-y-4">
        <p className="font-heading text-lg font-bold text-move-green">
          {diaActivo.label}
          <span className="ml-2 font-body text-sm font-normal text-move-green/50">
            {diaActivo.fechaLabel}
          </span>
        </p>

        {clasesDelDia.length === 0 ? (
          <p className="font-body text-sm text-move-green/60">{t.noClasesHoy}</p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {clasesDelDia.map((clase) => {
              const gym = clase.gimnasioId ? gymsById[clase.gimnasioId] : undefined;
              const yaReservada = reservedSet.has(clase.id);

              return (
                <li key={clase.id}>
                  <Link
                    href={`/gimnasios/${clase.gimnasioId}`}
                    className="block h-full rounded-2xl border border-move-green/10 bg-white p-5 transition-shadow hover:shadow-md"
                  >
                    <p className="font-heading text-xs font-semibold uppercase tracking-wide text-move-coral">
                      {gym?.name ?? t.gimnasioGenerico}
                    </p>
                    <div className="mt-2 flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-heading text-base font-semibold text-move-green">
                          {clase.name}
                        </p>
                        <p className="mt-1 font-body text-sm text-move-green/60 capitalize">
                          {clase.fecha ? formatHora(clase.fecha, locale) : t.horaPorConfirmar}
                        </p>
                      </div>
                      <span className="whitespace-nowrap rounded-full bg-move-coral/10 px-3 py-1 font-heading text-xs font-semibold text-move-coral">
                        {precioEfectivo(clase) < clase.credits && (
                          <span className="mr-1 text-move-green/40 line-through">
                            {clase.credits}
                          </span>
                        )}
                        {precioEfectivo(clase)} {locale === "en" ? "credits" : "créditos"}
                      </span>
                    </div>

                    {clase.descripcion && (
                      <p className="mt-2 font-body text-sm text-move-green/70">
                        {clase.descripcion}
                      </p>
                    )}

                    <p className="mt-3 font-body text-sm font-medium text-move-green/70">
                      {yaReservada
                        ? t.yaReservada
                        : clase.cuposDisponibles <= 2
                        ? clase.cuposDisponibles === 1
                          ? t.ultimoCupo
                          : t.ultimos2Cupos
                        : t.cuposDisponibles}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
