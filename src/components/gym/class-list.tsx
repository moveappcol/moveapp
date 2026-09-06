"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Show } from "@clerk/nextjs";
import { precioEfectivo, type Clase } from "@/lib/classes";
import ClassBookingForm from "./class-booking-form";

const BOOKING_CUTOFF_MINUTES = 20;

const DAY_KEY_FORMATTER = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" });

const NOMBRES_DIA = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const NOMBRES_MES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

type DiaTab = { id: string; dateKey: string; label: string; fechaLabel: string };

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** "Hoy" fijo de primero, seguido de los 7 días de la semana calendario
 * actual (lunes a domingo) en Bogotá, cada uno con su fecha — incluso el
 * que coincide con hoy se muestra con su nombre real, no se fusiona con la
 * pestaña "Hoy". Se recalcula solo con la fecha de hoy, así que "rueda" a
 * la semana siguiente sin ningún cambio de código. Toda la aritmética es
 * en UTC "de calendario" (sin horas) para no depender de la zona horaria
 * de quien ejecuta el código. */
function semanaActual(): DiaTab[] {
  const [yStr, mStr, dStr] = DAY_KEY_FORMATTER.format(new Date()).split("-");
  const hoy = { y: Number(yStr), m: Number(mStr), d: Number(dStr) };
  const hoyKey = `${yStr}-${mStr}-${dStr}`;

  const hoyUTC = Date.UTC(hoy.y, hoy.m - 1, hoy.d);
  const diaSemanaISO = (new Date(hoyUTC).getUTCDay() + 6) % 7; // lunes=0 ... domingo=6
  const lunesUTC = hoyUTC - diaSemanaISO * 86_400_000;

  const dias: DiaTab[] = [
    { id: "hoy", dateKey: hoyKey, label: "Hoy", fechaLabel: `${hoy.d} de ${NOMBRES_MES[hoy.m - 1]}` },
  ];

  for (let i = 0; i < 7; i++) {
    const fecha = new Date(lunesUTC + i * 86_400_000);
    const y = fecha.getUTCFullYear();
    const m = fecha.getUTCMonth() + 1;
    const d = fecha.getUTCDate();
    const dateKey = `${y}-${pad(m)}-${pad(d)}`;
    dias.push({ id: dateKey, dateKey, label: NOMBRES_DIA[i], fechaLabel: `${d} de ${NOMBRES_MES[m - 1]}` });
  }

  return dias;
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
}: {
  clase: Clase;
  gimnasioId: string;
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
          <p className="font-body text-sm text-move-green/50">Esta clase ya está llena.</p>
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
}: {
  gimnasioId: string;
  classes: Clase[];
}) {
  const semana = useMemo(() => semanaActual(), []);
  const [diaSeleccionadoId, setDiaSeleccionadoId] = useState("hoy");

  if (classes.length === 0) {
    return (
      <p className="font-body text-sm text-move-green/60">
        Todavía no hay clases publicadas para este gimnasio.
      </p>
    );
  }

  const diaActivo = semana.find((d) => d.id === diaSeleccionadoId) ?? semana[0];
  const clasesDelDia = classes.filter(
    (c) => c.fecha && DAY_KEY_FORMATTER.format(new Date(c.fecha)) === diaActivo.dateKey
  );
  const sinFecha = classes.filter((c) => !c.fecha);

  return (
    <div className="space-y-6">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {semana.map((dia) => (
          <button
            key={dia.id}
            type="button"
            onClick={() => setDiaSeleccionadoId(dia.id)}
            className={`flex shrink-0 flex-col items-center rounded-2xl px-3 py-2 font-heading transition ${
              diaSeleccionadoId === dia.id
                ? "bg-move-green text-white"
                : "bg-move-green/5 text-move-green/70 hover:bg-move-green/10"
            }`}
          >
            <span className="text-xs font-semibold uppercase tracking-wide">
              {dia.id === "hoy" ? "Hoy" : dia.label.slice(0, 3)}
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
              <ClaseCard key={clase.id} clase={clase} gimnasioId={gimnasioId} />
            ))}
          </ul>
        )}
      </div>

      {sinFecha.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-heading text-lg font-bold text-move-green">Fecha por confirmar</h3>
          <ul className="space-y-4">
            {sinFecha.map((clase) => (
              <ClaseCard key={clase.id} clase={clase} gimnasioId={gimnasioId} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
