"use client";

import { useActionState, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Show } from "@clerk/nextjs";
import { bookClass } from "@/app/gimnasios/[id]/actions";
import { precioEfectivo, type Clase } from "@/lib/classes";
import { DAY_KEY_FORMATTER, semanaActual, formatHora } from "@/lib/dias";
import type { BookingResult } from "@/lib/reservations";
import WaitlistForm from "./waitlist-form";

function ConfirmModal({
  remainingCredits,
  onClose,
}: {
  remainingCredits: number;
  onClose: () => void;
}) {
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-move-green/45 px-6">
      <div className="w-full max-w-sm rounded-2xl bg-white p-7 text-center shadow-xl">
        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-move-green">
          <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-white stroke-[3]">
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <p className="mt-3 font-heading text-lg font-bold text-move-green">Reserva confirmada</p>
        <p className="mt-1 font-body text-sm text-move-green/70">
          Créditos restantes: {remainingCredits}.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-full bg-move-coral px-5 py-2.5 font-heading text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          Listo
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
  yaReservada,
  bookingCutoffMinutes,
}: {
  clase: Clase;
  gimnasioId: string;
  waitlistStatus?: { enEspera: boolean; posicion: number | null };
  yaReservada: boolean;
  bookingCutoffMinutes: number;
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
        {justBooked ? (
          <ConfirmModal
            remainingCredits={bookState.ok ? bookState.remainingCredits : 0}
            onClose={() => setDismissed(true)}
          />
        ) : yaReservada ? (
          <p className="font-body text-sm font-medium text-move-green">
            Ya reservaste esta clase.
          </p>
        ) : !clase.fecha ? (
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
        ) : isBookingClosed(clase.fecha, bookingCutoffMinutes) ? (
          <p className="font-body text-sm text-move-green/50">
            Las reservas para esta clase ya cerraron.
          </p>
        ) : (
          <>
            <Show when="signed-in">
              <form action={bookFormAction} className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={isBooking}
                  className="rounded-full bg-move-coral px-5 py-2 font-heading text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {isBooking ? "Reservando…" : "Reservar"}
                </button>
                {bookState && !bookState.ok && (
                  <p className="w-full font-body text-sm text-move-coral">{bookState.error}</p>
                )}
                {bookState && !bookState.ok && bookState.code === "perfil_incompleto" && (
                  <Link
                    href="/completar-perfil"
                    className="w-full font-heading text-sm font-semibold text-move-coral hover:underline"
                  >
                    Completar perfil
                  </Link>
                )}
              </form>
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
  reservedClaseIds,
  bookingCutoffMinutes,
}: {
  gimnasioId: string;
  classes: Clase[];
  waitlistStatus?: WaitlistStatusMap;
  reservedClaseIds?: string[];
  bookingCutoffMinutes: number;
}) {
  const semana = useMemo(() => semanaActual(), []);
  const [diaSeleccionado, setDiaSeleccionado] = useState(() => semana[0].key);
  const reservedSet = useMemo(() => new Set(reservedClaseIds ?? []), [reservedClaseIds]);

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
                yaReservada={reservedSet.has(clase.id)}
                bookingCutoffMinutes={bookingCutoffMinutes}
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
                yaReservada={reservedSet.has(clase.id)}
                bookingCutoffMinutes={bookingCutoffMinutes}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
