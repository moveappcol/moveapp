"use client";

import { useEffect, useMemo, useState } from "react";
import { formatHora, semanaActual } from "@/lib/dias";
import { obtenerPanel } from "./actions";
import type { PanelDia } from "./data";
import CuposEditor from "./cupos-editor";
import WaitlistRow from "./waitlist-row";

const POLL_MS = 20_000;

export default function PanelLive({ initialDias }: { initialDias: PanelDia[] }) {
  const [dias, setDias] = useState(initialDias);
  const semana = useMemo(() => semanaActual("es"), []);
  const [diaSeleccionado, setDiaSeleccionado] = useState(() => semana[0].key);

  useEffect(() => {
    const id = setInterval(async () => {
      const fresh = await obtenerPanel();
      if (fresh) setDias(fresh);
    }, POLL_MS);
    return () => clearInterval(id);
  }, []);

  const diaActivo = semana.find((d) => d.key === diaSeleccionado) ?? semana[0];
  const clasesDelDia = dias.find((d) => d.key === diaActivo.key)?.clases ?? [];

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

      <div>
        <p className="font-heading text-lg font-bold text-move-green">
          {diaActivo.label}
          <span className="ml-2 font-body text-sm font-normal text-move-green/50">
            {diaActivo.fechaLabel}
          </span>
        </p>

        {clasesDelDia.length === 0 ? (
          <p className="mt-4 font-body text-sm text-move-green/60">
            No tienes clases programadas este día.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            {clasesDelDia.map((clase) => (
              <div key={clase.id} className="rounded-2xl border border-move-green/10 bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-heading text-base font-semibold text-move-green">
                      {clase.name}
                    </p>
                    <p className="mt-0.5 font-body text-sm text-move-green/60">
                      {formatHora(clase.fecha)}
                    </p>
                    <p className="mt-0.5 font-body text-xs text-move-green/50">
                      {clase.credits} créditos
                    </p>
                  </div>
                  <CuposEditor claseId={clase.id} cuposActuales={clase.cuposTotales} />
                </div>

                <div className="mt-4 border-t border-move-green/10 pt-4">
                  <p className="font-heading text-xs font-semibold uppercase tracking-wide text-move-green/50">
                    Inscritos ({clase.activas.length})
                  </p>
                  {clase.activas.length === 0 ? (
                    <p className="mt-2 font-body text-sm text-move-green/50">
                      Nadie se ha inscrito todavía.
                    </p>
                  ) : (
                    <ul className="mt-2 space-y-1">
                      {clase.activas.map((r) => (
                        <li key={r.id} className="font-body text-sm text-move-green/80">
                          {r.userName}
                          {r.molestias && <span className="text-move-coral"> — {r.molestias}</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                  {clase.canceladas.length > 0 && (
                    <p className="mt-3 font-body text-xs text-move-green/40">
                      {clase.canceladas.length} cancelación
                      {clase.canceladas.length === 1 ? "" : "es"}:{" "}
                      {clase.canceladas.map((r) => r.userName).join(", ")}
                    </p>
                  )}
                </div>

                {clase.esperando.length > 0 && (
                  <div className="mt-4 border-t border-move-green/10 pt-4">
                    <p className="font-heading text-xs font-semibold uppercase tracking-wide text-move-coral">
                      Lista de espera ({clase.esperando.length})
                    </p>
                    <ul className="mt-2 space-y-2">
                      {clase.esperando.map((e) => (
                        <WaitlistRow
                          key={e.id}
                          claseId={clase.id}
                          entryId={e.id}
                          nombre={e.nombre}
                          correo={e.correo}
                        />
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
