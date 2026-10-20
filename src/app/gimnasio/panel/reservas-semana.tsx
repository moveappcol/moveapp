"use client";

import { formatHora } from "@/lib/dias";
import type { PanelDia } from "./data";

/** Resumen de toda la semana (los mismos `dias` que ya carga el panel, solo
 * que aquí no hay que entrar día por día: se listan juntas todas las clases
 * que SÍ tienen al menos una reserva activa, agrupadas por día — para que
 * el gimnasio pueda ver de un vistazo qué tiene reservado esta semana. */
export default function ReservasSemana({ dias }: { dias: PanelDia[] }) {
  const diasConReservas = dias
    .map((dia) => ({
      ...dia,
      clases: dia.clases.filter((c) => c.activas.length > 0),
    }))
    .filter((dia) => dia.clases.length > 0);

  if (diasConReservas.length === 0) {
    return (
      <p className="font-body text-sm text-move-green/60">
        Todavía no tienes ninguna reserva esta semana.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {diasConReservas.map((dia) => (
        <div key={dia.key}>
          <p className="font-heading text-sm font-bold uppercase tracking-wide text-move-coral">
            {dia.label}
          </p>
          <div className="mt-2 space-y-2">
            {dia.clases.map((clase) => (
              <div
                key={clase.id}
                className="rounded-xl border border-move-green/10 bg-white px-4 py-3"
              >
                <p className="font-heading text-sm font-semibold text-move-green">
                  {formatHora(clase.fecha)} — {clase.name}
                  <span className="ml-2 font-body text-xs font-normal text-move-green/50">
                    ({clase.activas.length} {clase.activas.length === 1 ? "reserva" : "reservas"})
                  </span>
                </p>
                <p className="mt-1 font-body text-sm text-move-green/70">
                  {clase.activas.map((r) => r.userName).join(", ")}
                </p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
