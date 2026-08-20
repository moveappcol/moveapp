import Link from "next/link";
import { Show } from "@clerk/nextjs";
import type { Clase } from "@/lib/classes";
import ClassBookingForm from "./class-booking-form";

const BOOKING_CUTOFF_MINUTES = 20;

function formatFecha(fecha: string | null): string {
  if (!fecha) return "Fecha por confirmar";
  return new Date(fecha).toLocaleString("es-CO", {
    timeZone: "America/Bogota",
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
  });
}

function isBookingClosed(fecha: string): boolean {
  const minutesUntilClass = (new Date(fecha).getTime() - Date.now()) / (1000 * 60);
  return minutesUntilClass < BOOKING_CUTOFF_MINUTES;
}

/** No mostramos el conteo exacto de cupos: si queda más de la mitad no se
 * dice nada, y si queda la mitad o menos se avisa en rojo sin dar el
 * número. Si ya no queda ninguno, el mensaje de "clase llena" de abajo ya
 * lo cubre. */
function CuposAviso({ cuposDisponibles, cuposTotales }: { cuposDisponibles: number; cuposTotales: number }) {
  if (cuposDisponibles <= 0 || cuposTotales <= 0) return null;
  if (cuposDisponibles / cuposTotales > 0.5) return null;

  return (
    <p className="mt-1 font-body text-sm font-medium text-red-600">
      Quedan pocos cupos disponibles
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
  if (classes.length === 0) {
    return (
      <p className="font-body text-sm text-move-green/60">
        Todavía no hay clases publicadas para este gimnasio.
      </p>
    );
  }

  return (
    <ul className="space-y-4">
      {classes.map((clase) => (
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
                {formatFecha(clase.fecha)}
              </p>
              <CuposAviso
                cuposDisponibles={clase.cuposDisponibles}
                cuposTotales={clase.cuposTotales}
              />
            </div>
            <span className="whitespace-nowrap rounded-full bg-move-coral/10 px-3 py-1 font-heading text-xs font-semibold text-move-coral">
              {clase.credits} créditos
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
  );
}
