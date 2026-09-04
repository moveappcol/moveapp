"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Show } from "@clerk/nextjs";
import { precioEfectivo, type Clase } from "@/lib/classes";
import ClassBookingForm from "./class-booking-form";

const BOOKING_CUTOFF_MINUTES = 20;

type Franja = "manana" | "tarde" | "noche";
const FRANJAS: { key: Franja; label: string }[] = [
  { key: "manana", label: "Mañana" },
  { key: "tarde", label: "Tarde" },
  { key: "noche", label: "Noche" },
];

const HOUR_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Bogota",
  hour: "numeric",
  hourCycle: "h23",
});

function franjaDeFecha(fecha: string): Franja {
  const hora = parseInt(HOUR_FORMATTER.format(new Date(fecha)), 10);
  if (hora < 12) return "manana";
  if (hora < 18) return "tarde";
  return "noche";
}

const DAY_KEY_FORMATTER = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" });
const WEEKDAY_FORMATTER = new Intl.DateTimeFormat("es-CO", {
  timeZone: "America/Bogota",
  weekday: "long",
});
const DATE_FORMATTER = new Intl.DateTimeFormat("es-CO", {
  timeZone: "America/Bogota",
  day: "numeric",
  month: "long",
});

function formatHora(fecha: string): string {
  return new Date(fecha).toLocaleString("es-CO", {
    timeZone: "America/Bogota",
    hour: "numeric",
    minute: "2-digit",
  });
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

type DiaGrupo = { key: string; titulo: string; fechaLabel: string | null; classes: Clase[] };

/** Agrupa las clases por día calendario en Bogotá (Hoy, Mañana, luego el
 * nombre del día) para que sea más fácil escoger entre toda la semana. Las
 * clases ya llegan ordenadas cronológicamente, así que solo hay que
 * repartirlas en baldes preservando ese orden. */
function groupByDia(classes: Clase[]): DiaGrupo[] {
  const hoyKey = DAY_KEY_FORMATTER.format(new Date());
  const mananaKey = DAY_KEY_FORMATTER.format(new Date(Date.now() + 24 * 60 * 60 * 1000));

  const grupos: DiaGrupo[] = [];
  const sinFecha: Clase[] = [];

  for (const clase of classes) {
    if (!clase.fecha) {
      sinFecha.push(clase);
      continue;
    }
    const fecha = new Date(clase.fecha);
    const key = DAY_KEY_FORMATTER.format(fecha);
    let grupo = grupos.find((g) => g.key === key);
    if (!grupo) {
      const titulo =
        key === hoyKey ? "Hoy" : key === mananaKey ? "Mañana" : capitalize(WEEKDAY_FORMATTER.format(fecha));
      grupo = { key, titulo, fechaLabel: DATE_FORMATTER.format(fecha), classes: [] };
      grupos.push(grupo);
    }
    grupo.classes.push(clase);
  }

  if (sinFecha.length > 0) {
    grupos.push({ key: "sin-fecha", titulo: "Fecha por confirmar", fechaLabel: null, classes: sinFecha });
  }

  return grupos;
}

function isBookingClosed(fecha: string): boolean {
  const minutesUntilClass = (new Date(fecha).getTime() - Date.now()) / (1000 * 60);
  return minutesUntilClass < BOOKING_CUTOFF_MINUTES;
}

/** No mostramos el conteo de cupos en ningún otro caso — solo cuando quedan
 * 2 o menos se avisa, sin decir el total. Si ya no queda ninguno, el
 * mensaje de "clase llena" de abajo ya lo cubre. */
function CuposAviso({ cuposDisponibles }: { cuposDisponibles: number }) {
  if (cuposDisponibles <= 0 || cuposDisponibles > 2) return null;

  return (
    <p className="mt-1 font-heading text-sm font-bold uppercase tracking-wide text-red-600">
      {cuposDisponibles === 1 ? "Último cupo disponible" : "Últimos 2 cupos disponibles"}
    </p>
  );
}

export default function ClassList({
  gimnasioId,
  classes,
}: {
  gimnasioId: string;
  classes: Clase[];
}) {
  const [franja, setFranja] = useState<Franja | null>(null);

  const filtradas = useMemo(() => {
    if (!franja) return classes;
    return classes.filter((clase) => !clase.fecha || franjaDeFecha(clase.fecha) === franja);
  }, [classes, franja]);

  if (classes.length === 0) {
    return (
      <p className="font-body text-sm text-move-green/60">
        Todavía no hay clases publicadas para este gimnasio.
      </p>
    );
  }

  const grupos = groupByDia(filtradas);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setFranja(null)}
          className={`rounded-full px-4 py-1.5 font-heading text-xs font-semibold transition ${
            franja === null
              ? "bg-move-green text-white"
              : "bg-move-green/5 text-move-green/70 hover:bg-move-green/10"
          }`}
        >
          Todo el día
        </button>
        {FRANJAS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFranja((prev) => (prev === f.key ? null : f.key))}
            className={`rounded-full px-4 py-1.5 font-heading text-xs font-semibold transition ${
              franja === f.key
                ? "bg-move-green text-white"
                : "bg-move-green/5 text-move-green/70 hover:bg-move-green/10"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {grupos.length === 0 && (
        <p className="font-body text-sm text-move-green/60">
          No hay clases en esa franja horaria — prueba con otro filtro.
        </p>
      )}

      <div className="space-y-8">
        {grupos.map((grupo) => (
        <section key={grupo.key}>
          <div className="mb-3 flex items-baseline gap-2">
            <h3 className="font-heading text-lg font-bold text-move-green">{grupo.titulo}</h3>
            {grupo.fechaLabel && (
              <span className="font-body text-sm text-move-green/50">{grupo.fechaLabel}</span>
            )}
          </div>

          <ul className="space-y-4">
            {grupo.classes.map((clase) => (
              <li
                key={clase.id}
                className="rounded-2xl border border-move-green/10 bg-white p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-heading text-base font-semibold text-move-green">
                      {clase.name}
                    </p>
                    <p className="mt-1 font-body text-sm text-move-green/60 capitalize">
                      {clase.fecha ? formatHora(clase.fecha) : "Hora por confirmar"}
                    </p>
                    <CuposAviso cuposDisponibles={clase.cuposDisponibles} />
                  </div>
                  <span className="whitespace-nowrap rounded-full bg-move-coral/10 px-3 py-1 font-heading text-xs font-semibold text-move-coral">
                    {precioEfectivo(clase) < clase.credits && (
                      <span className="mr-1 text-move-green/40 line-through">{clase.credits}</span>
                    )}
                    {precioEfectivo(clase)} créditos
                  </span>
                </div>

                <div className="mt-4">
                  {!clase.fecha ? (
                    <p className="font-body text-sm text-move-green/50">
                      Todavía no tiene fecha confirmada.
                    </p>
                  ) : clase.cuposDisponibles <= 0 ? (
                    <p className="font-body text-sm text-move-green/50">
                      Esta clase ya está llena.
                    </p>
                  ) : isBookingClosed(clase.fecha) ? (
                    <p className="font-body text-sm text-move-green/50">
                      Las reservas para esta clase ya cerraron.
                    </p>
                  ) : (
                    <>
                      <Show when="signed-in">
                        <ClassBookingForm gimnasioId={gimnasioId} claseId={clase.id} />
                      </Show>
                      <Show when="signed-out">
                        <Link
                          href="/iniciar-sesion"
                          className="font-heading text-sm font-semibold text-move-coral hover:underline"
                        >
                          Inicia sesión para reservar
                        </Link>
                      </Show>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
      </div>
    </div>
  );
}
