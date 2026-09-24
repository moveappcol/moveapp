"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Show } from "@clerk/nextjs";
import { bookClass } from "@/app/gimnasios/[id]/actions";
import { precioEfectivo, type Clase } from "@/lib/classes";
import { DAY_KEY_FORMATTER, semanaActual, formatHora } from "@/lib/dias";
import type { BookingResult } from "@/lib/reservations";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/locale";
import WaitlistForm from "./waitlist-form";

type T = Dictionary["gimnasio"];

function ConfirmModal({
  remainingCredits,
  onClose,
  t,
}: {
  remainingCredits: number;
  onClose: () => void;
  t: T;
}) {
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-move-green/45 px-6">
      <div className="w-full max-w-sm rounded-2xl bg-white p-7 text-center shadow-xl">
        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-move-green">
          <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-white stroke-[3]">
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <p className="mt-3 font-heading text-lg font-bold text-move-green">{t.reservaConfirmada}</p>
        <p className="mt-1 font-body text-sm text-move-green/70">
          {t.creditosRestantes(remainingCredits)}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-full bg-move-coral px-5 py-2.5 font-heading text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          {t.listo}
        </button>
      </div>
    </div>,
    document.body
  );
}

export type WaitlistStatusMap = Record<string, { enEspera: boolean; posicion: number | null }>;

function isBookingClosed(fecha: string, cutoffMinutes: number): boolean {
  const minutesUntilClass = (new Date(fecha).getTime() - Date.now()) / (1000 * 60);
  return minutesUntilClass < cutoffMinutes;
}

/** No mostramos el conteo de cupos en ningún otro caso — solo cuando quedan
 * 2 o menos se avisa, sin decir el total. Si ya no queda ninguno, el
 * mensaje de "clase llena" de abajo ya lo cubre. */
function CuposAviso({ cuposDisponibles, t }: { cuposDisponibles: number; t: T }) {
  if (cuposDisponibles <= 0 || cuposDisponibles > 2) return null;

  return (
    <p className="mt-1 font-heading text-sm font-bold uppercase tracking-wide text-red-600">
      {cuposDisponibles === 1 ? t.ultimoCupo : t.ultimos2Cupos}
    </p>
  );
}

function ClaseCard({
  clase,
  gimnasioId,
  waitlistStatus,
  yaReservada,
  bookingCutoffMinutes,
  locale,
  t,
  reservasAbiertas,
  reservasAbrenLabel,
  highlighted,
}: {
  clase: Clase;
  gimnasioId: string;
  waitlistStatus?: { enEspera: boolean; posicion: number | null };
  yaReservada: boolean;
  bookingCutoffMinutes: number;
  locale: Locale;
  t: T;
  reservasAbiertas: boolean;
  reservasAbrenLabel: string;
  /** true cuando se llegó acá con un link directo a esta clase (ej. desde
   * el explorador "por día" del home) — le pone un aro de color para que
   * sea obvio cuál es, sin tener que volver a buscarla en la lista. */
  highlighted?: boolean;
}) {
  /* useActionState vive aquí (no en un hijo) a propósito: bookClass() hace
   * revalidatePath, y ese revalidate llega en la MISMA transición en la que
   * se resuelve el estado de la acción — si el formulario estuviera en un
   * componente separado, ese componente se desmontaría (yaReservada pasa a
   * true) antes de que su propio useEffect llegara a avisar del éxito.
   * ClaseCard nunca se desmonta (misma key en la lista), así que su estado
   * sobrevive al cambio. */
  const bookAction = bookClass.bind(null, gimnasioId, clase.id);
  const [bookState, bookFormAction, isBooking] = useActionState<BookingResult | null, FormData>(
    bookAction,
    null
  );
  const [dismissed, setDismissed] = useState(false);
  const justBooked = bookState?.ok && !dismissed;

  return (
    <li
      id={`clase-${clase.id}`}
      className={`rounded-2xl border bg-white p-5 transition-shadow ${
        highlighted ? "border-move-coral ring-2 ring-move-coral/40" : "border-move-green/10"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-heading text-base font-semibold text-move-green">{clase.name}</p>
          <p className="mt-1 font-body text-sm text-move-green/60 capitalize">
            {clase.fecha ? formatHora(clase.fecha, locale) : t.horaPorConfirmar}
          </p>
          {clase.descripcion && (
            <p className="mt-1 font-body text-sm text-move-green/70">{clase.descripcion}</p>
          )}
          <CuposAviso cuposDisponibles={clase.cuposDisponibles} t={t} />
        </div>
        <span className="whitespace-nowrap rounded-full bg-move-coral/10 px-3 py-1 font-heading text-xs font-semibold text-move-coral">
          {precioEfectivo(clase) < clase.credits && (
            <span className="mr-1 text-move-green/40 line-through">{clase.credits}</span>
          )}
          {t.credits(precioEfectivo(clase))}
        </span>
      </div>

      <div className="mt-4">
        {justBooked ? (
          <ConfirmModal
            remainingCredits={bookState.ok ? bookState.remainingCredits : 0}
            onClose={() => setDismissed(true)}
            t={t}
          />
        ) : yaReservada ? (
          <p className="font-body text-sm font-medium text-move-green">{t.yaReservada}</p>
        ) : !reservasAbiertas ? (
          <p className="font-body text-sm text-move-green/50">{t.reservasAbrenEl(reservasAbrenLabel)}</p>
        ) : !clase.fecha ? (
          <p className="font-body text-sm text-move-green/50">{t.sinFechaConfirmada}</p>
        ) : clase.cuposDisponibles <= 0 ? (
          <>
            <p className="mb-2 font-body text-sm text-move-green/50">{t.claseLlena}</p>
            <Show when="signed-in">
              <WaitlistForm
                gimnasioId={gimnasioId}
                claseId={clase.id}
                initialEnEspera={waitlistStatus?.enEspera ?? false}
                initialPosicion={waitlistStatus?.posicion ?? null}
                t={t.waitlist}
              />
            </Show>
            <Show when="signed-out">
              <Link
                href="/iniciar-sesion"
                className="font-heading text-sm font-semibold text-move-coral hover:underline"
              >
                {t.iniciaSesionListaEspera}
              </Link>
            </Show>
          </>
        ) : isBookingClosed(clase.fecha, bookingCutoffMinutes) ? (
          <p className="font-body text-sm text-move-green/50">{t.reservasCerraron}</p>
        ) : (
          <>
            <Show when="signed-in">
              <form action={bookFormAction} className="flex flex-wrap items-center gap-3">
                <label className="block w-full">
                  <span className="font-body text-xs text-move-green/60">{t.molestiasLabel}</span>
                  <textarea
                    name="molestias"
                    rows={2}
                    maxLength={300}
                    placeholder={t.molestiasPlaceholder}
                    className="mt-1 w-full rounded-xl border border-move-green/20 px-3 py-2 font-body text-sm text-move-green outline-none focus:border-move-coral"
                  />
                </label>
                <button
                  type="submit"
                  disabled={isBooking}
                  className="rounded-full bg-move-coral px-5 py-2 font-heading text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {isBooking ? t.reservando : t.reservar}
                </button>
                {bookState && !bookState.ok && (
                  <p className="w-full font-body text-sm text-move-coral">{bookState.error}</p>
                )}
                {bookState && !bookState.ok && bookState.code === "perfil_incompleto" && (
                  <Link
                    href="/completar-perfil"
                    className="w-full font-heading text-sm font-semibold text-move-coral hover:underline"
                  >
                    {t.completarPerfil}
                  </Link>
                )}
              </form>
            </Show>
            <Show when="signed-out">
              <Link
                href="/iniciar-sesion"
                className="font-heading text-sm font-semibold text-move-coral hover:underline"
              >
                {t.iniciaSesionReservar}
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
  reservedClaseIds,
  bookingCutoffMinutes,
  locale,
  reservasAbiertas,
  reservasAbrenLabel,
  targetClaseId,
}: {
  gimnasioId: string;
  classes: Clase[];
  waitlistStatus?: WaitlistStatusMap;
  reservedClaseIds?: string[];
  bookingCutoffMinutes: number;
  locale: Locale;
  reservasAbiertas: boolean;
  reservasAbrenLabel: string;
  /** Id de la clase a la que se llegó con un link directo (ej. desde el
   * explorador "por día" del home) — si viene, se abre de una en el día
   * correcto y se resalta, en vez de que la persona tenga que volver a
   * buscarla entre todos los días. */
  targetClaseId?: string;
}) {
  // No se recibe `t` como prop porque este componente es la primera
  // frontera cliente — algunas claves de dict.gimnasio son funciones
  // (credits, creditosRestantes, waitlist.enEspera), y React no puede
  // serializar funciones al cruzar de un Server Component a un Client
  // Component. Se calcula acá mismo (getDictionary es una función pura,
  // no usa cookies()), y de ahí para abajo ya es todo cliente-a-cliente,
  // donde pasar funciones sí es válido.
  const t = getDictionary(locale).gimnasio;
  const semana = useMemo(() => semanaActual(locale), [locale]);
  const targetClase = useMemo(
    () => (targetClaseId ? classes.find((c) => c.id === targetClaseId) : undefined),
    [classes, targetClaseId]
  );
  const targetDiaKey =
    targetClase?.fecha && DAY_KEY_FORMATTER.format(new Date(targetClase.fecha));
  const [diaSeleccionado, setDiaSeleccionado] = useState(
    () => semana.find((d) => d.key === targetDiaKey)?.key ?? semana[0].key
  );
  const reservedSet = useMemo(() => new Set(reservedClaseIds ?? []), [reservedClaseIds]);
  const scrolledRef = useRef(false);

  useEffect(() => {
    if (!targetClaseId || scrolledRef.current) return;
    const el = document.getElementById(`clase-${targetClaseId}`);
    if (!el) return;
    scrolledRef.current = true;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  });

  if (classes.length === 0) {
    return <p className="font-body text-sm text-move-green/60">{t.sinClasesProgramadas}</p>;
  }

  const diaActivo = semana.find((d) => d.key === diaSeleccionado) ?? semana[0];
  const clasesDelDia = classes.filter(
    (c) => c.fecha && DAY_KEY_FORMATTER.format(new Date(c.fecha)) === diaActivo.key
  );

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
          <p className="font-body text-sm text-move-green/60">{t.noHayClasesEsteDia}</p>
        ) : (
          <ul className="space-y-4">
            {clasesDelDia.map((clase) => (
              <ClaseCard
                key={clase.id}
                clase={clase}
                gimnasioId={gimnasioId}
                waitlistStatus={waitlistStatus?.[clase.id]}
                yaReservada={reservedSet.has(clase.id)}
                bookingCutoffMinutes={bookingCutoffMinutes}
                locale={locale}
                t={t}
                reservasAbiertas={reservasAbiertas}
                reservasAbrenLabel={reservasAbrenLabel}
                highlighted={clase.id === targetClaseId}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
