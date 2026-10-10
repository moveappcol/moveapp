"use client";

import { useEffect, useState } from "react";
import { formatHora } from "@/lib/dias";
import { obtenerPanel } from "./actions";
import type { PanelDia } from "./data";
import CuposEditor from "./cupos-editor";
import WaitlistRow from "./waitlist-row";

const POLL_MS = 20_000;

export default function PanelLive({ initialDias }: { initialDias: PanelDia[] }) {
  const [dias, setDias] = useState(initialDias);

  useEffect(() => {
    const id = setInterval(async () => {
      const fresh = await obtenerPanel();
      if (fresh) setDias(fresh);
    }, POLL_MS);
    return () => clearInterval(id);
  }, []);

  if (dias.length === 0) {
    return (
      <p className="mt-10 font-body text-sm text-move-green/60">
        No tienes clases próximas programadas todavía.
      </p>
    );
  }

  return (
    <div className="mt-8 space-y-10">
      {dias.map((dia) => (
        <div key={dia.key}>
          <h2 className="font-heading text-sm font-bold uppercase tracking-wide text-move-green">
            {dia.label}
          </h2>
          <div className="mt-3 space-y-4">
            {dia.clases.map((clase) => (
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
        </div>
      ))}
    </div>
  );
}
