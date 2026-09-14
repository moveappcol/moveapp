"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { precioEfectivo, type Clase } from "@/lib/classes";
import { DAY_KEY_FORMATTER, semanaActual, formatHora } from "@/lib/dias";

export type GymInfo = { name: string; activities: string[] };

export default function ClassesByDayExplorer({
  classes,
  gymsById,
  reservedClaseIds,
}: {
  classes: Clase[];
  gymsById: Record<string, GymInfo>;
  reservedClaseIds?: string[];
}) {
  const semana = useMemo(() => semanaActual(), []);
  const [diaSeleccionado, setDiaSeleccionado] = useState(() => semana[0].key);
  const reservedSet = useMemo(() => new Set(reservedClaseIds ?? []), [reservedClaseIds]);

  const diaActivo = semana.find((d) => d.key === diaSeleccionado) ?? semana[0];
  const clasesDelDia = classes
    .filter((c) => c.fecha && DAY_KEY_FORMATTER.format(new Date(c.fecha)) === diaActivo.key)
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

      <div className="space-y-4">
        <p className="font-heading text-lg font-bold text-move-green">
          {diaActivo.label}
          <span className="ml-2 font-body text-sm font-normal text-move-green/50">
            {diaActivo.fechaLabel}
          </span>
        </p>

        {clasesDelDia.length === 0 ? (
          <p className="font-body text-sm text-move-green/60">
            No hay clases programadas para este día.
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {clasesDelDia.map((clase) => {
              const gym = clase.gimnasioId ? gymsById[clase.gimnasioId] : undefined;
              const yaReservada = reservedSet.has(clase.id);
              const llena = clase.cuposDisponibles <= 0;

              return (
                <li key={clase.id}>
                  <Link
                    href={`/gimnasios/${clase.gimnasioId}`}
                    className="block h-full rounded-2xl border border-move-green/10 bg-white p-5 transition-shadow hover:shadow-md"
                  >
                    <p className="font-heading text-xs font-semibold uppercase tracking-wide text-move-coral">
                      {gym?.name ?? "Gimnasio"}
                    </p>
                    <div className="mt-2 flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-heading text-base font-semibold text-move-green">
                          {clase.name}
                        </p>
                        <p className="mt-1 font-body text-sm text-move-green/60 capitalize">
                          {clase.fecha ? formatHora(clase.fecha) : "Hora por confirmar"}
                        </p>
                      </div>
                      <span className="whitespace-nowrap rounded-full bg-move-coral/10 px-3 py-1 font-heading text-xs font-semibold text-move-coral">
                        {precioEfectivo(clase) < clase.credits && (
                          <span className="mr-1 text-move-green/40 line-through">
                            {clase.credits}
                          </span>
                        )}
                        {precioEfectivo(clase)} créditos
                      </span>
                    </div>

                    <p className="mt-3 font-body text-sm font-medium text-move-green/70">
                      {yaReservada
                        ? "Ya reservaste esta clase."
                        : llena
                        ? "Clase llena — únete a la lista de espera"
                        : clase.cuposDisponibles <= 2
                        ? clase.cuposDisponibles === 1
                          ? "Último cupo disponible"
                          : "Últimos 2 cupos disponibles"
                        : "Cupos disponibles"}
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
