"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Show } from "@clerk/nextjs";
import { precioEfectivo, type Clase } from "@/lib/classes";
import ClassBookingForm from "./class-booking-form";
import WaitlistForm from "./waitlist-form";

export type WaitlistStatusMap = Record<string, { enEspera: boolean; posicion: number | null }>;

const BOOKING_CUTOFF_MINUTES = 20;

const DAY_KEY_FORMATTER = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" });

const NOMBRES_DIA = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const NOMBRES_MES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

type DiaTab = { key: string; label: string; fechaLabel: string };

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** "Hoy" primero, seguido de los días que faltan hasta el domingo de esta
 * semana (no toda la semana completa) — el lunes siguiente vuelve a
 * empezar en "Hoy" con los 7 días por delante. La fecha de hoy siempre es
 * la primera pestaña. Se recalcula solo con la fecha de hoy, así que rueda
 * sola sin ningún cambio de código. Toda la aritmética es en UTC "de
 * calendario" (sin horas) para no depender de la zona horaria de quien
 * ejecuta el código. */
function semanaActual(): DiaTab[] {
  const [yStr, mStr, dStr] = DAY_KEY_FORMATTER.format(new Date()).split("-");
  const hoyUTC = Date.UTC(Number(yStr), Number(mStr) - 1, Number(dStr));
  const diaSemanaISO = (new Date(hoyUTC).getUTCDay() + 6) % 7; // lunes=0 ... domingo=6
  const diasHastaDomingo = 7 - diaSemanaISO; // incluye hoy

  return Array.from({ length: diasHastaDomingo }, (_, i) => {
    const fecha = new Date(hoyUTC + i * 86_400_000);
    const y = fecha.getUTCFullYear();
    const m = fecha.getUTCMonth() + 1;
    const d = fecha.getUTCDate();
    const key = `${y}-${pad(m)}-${pad(d)}`;
    const nombre = NOMBRES_DIA[(diaSemanaISO + i) % 7];
    return { key, label: i === 0 ? "Hoy" : nombre, fechaLabel: `${d} de ${NOMBRES_MES[m - 1]}` };
  });
}

function formatHora(fecha: string): string {
  return new Date(fecha).toLocaleString("es-CO", {
    timeZone: "America/Bogota",
    hour: "numeric",
    minute: "2-digit",
  });
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

function ClaseCard({
  clase,
  gimnasioId,
  waitlistStatus,
}: {
  clase: Clase;
  gimnasioId: string;
  waitlistStatus?: { enEspera: boolean; posicion: number | null };
}) {
  return (
    <li className="rounded-2xl border border-move-green/10 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-heading text-base font-semibold text-move-green">{clase.name}</p>
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
          <p className="font-body text-sm text-move-green/50">Todavía no tiene fecha confirmada.</p>
        ) : clase.cuposDisponibles <= 0 ? (
          <>
            <p className="mb-2 font-body text-sm text-move-green/50">Esta clase ya está llena.</p>
            <Show when="signed-in">
              <WaitlistForm
                gimnasioId={gimnasioId}
                claseId={clase.id}
                initialEnEspera={waitlistStatus?.enEspera ?? false}
                initialPosicion={waitlistStatus?.posicion ?? null}
              />
            </Show>
            <Show when="signed-out">
              <Link
                href="/iniciar-sesion"
                className="font-heading text-sm font-semibold text-move-coral hover:underline"
              >
                Inicia sesión para unirte a la lista de espera
              </Link>
            </Show>
          </>
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
  );
}

export default function ClassList({
  gimnasioId,
  classes,
  waitlistStatus,
}: {
  gimnasioId: string;
  classes: Clase[];
  waitlistStatus?: WaitlistStatusMap;
}) {
  const semana = useMemo(() => semanaActual(), []);
  const [diaSeleccionado, setDiaSeleccionado] = useState(() => semana[0].key);

  if (classes.length === 0) {
    return (
      <p className="font-body text-sm text-move-green/60">
        Todavía no hay clases publicadas para este gimnasio.
      </p>
    );
  }

  const diaActivo = semana.find((d) => d.key === diaSeleccionado) ?? semana[0];
  const clasesDelDia = classes.filter(
    (c) => c.fecha && DAY_KEY_FORMATTER.format(new Date(c.fecha)) === diaActivo.key
  );
  const sinFecha = classes.filter((c) => !c.fecha);

  return (
    <div className="space-y-6">
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
          <ul className="space-y-4">
            {clasesDelDia.map((clase) => (
              <ClaseCard
                key={clase.id}
                clase={clase}
                gimnasioId={gimnasioId}
                waitlistStatus={waitlistStatus?.[clase.id]}
              />
            ))}
          </ul>
        )}
      </div>

      {sinFecha.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-heading text-lg font-bold text-move-green">Fecha por confirmar</h3>
          <ul className="space-y-4">
            {sinFecha.map((clase) => (
              <ClaseCard
                key={clase.id}
                clase={clase}
                gimnasioId={gimnasioId}
                waitlistStatus={waitlistStatus?.[clase.id]}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
