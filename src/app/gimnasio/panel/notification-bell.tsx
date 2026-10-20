"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { obtenerNotificaciones, marcarNotificacionesLeidasPanel } from "./actions";
import type { Notificacion } from "@/lib/notificaciones";

const POLL_MS = 20_000;

const ICONO_POR_TIPO: Record<Notificacion["tipo"], string> = {
  "Nueva reserva": "📅",
  "Lista de espera": "⏳",
  Cancelación: "❌",
};

function tiempoRelativo(createdTime: string): string {
  const minutos = Math.max(0, Math.round((Date.now() - new Date(createdTime).getTime()) / 60_000));
  if (minutos < 1) return "ahora mismo";
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.round(horas / 24);
  return `hace ${dias} d`;
}

export default function NotificationBell() {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [abierta, setAbierta] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const refrescar = useCallback(async () => {
    const fresh = await obtenerNotificaciones();
    setNotificaciones(fresh);
  }, []);

  useEffect(() => {
    refrescar();
    const id = setInterval(refrescar, POLL_MS);
    return () => clearInterval(id);
  }, [refrescar]);

  useEffect(() => {
    if (!abierta) return;
    function onClickFuera(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierta(false);
    }
    document.addEventListener("mousedown", onClickFuera);
    return () => document.removeEventListener("mousedown", onClickFuera);
  }, [abierta]);

  const noLeidas = notificaciones.filter((n) => !n.leida).length;

  async function abrir() {
    setAbierta((v) => !v);
    if (!abierta && noLeidas > 0) {
      // Optimista: se ven leídas de una, sin esperar la confirmación del
      // servidor — si falla, el próximo refrescar() las vuelve a traer.
      setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })));
      await marcarNotificacionesLeidasPanel();
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={abrir}
        aria-label="Notificaciones"
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-move-green/20 text-lg transition-colors hover:border-move-green"
      >
        🔔
        {noLeidas > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-move-coral px-1 font-heading text-[11px] font-bold text-white">
            {noLeidas > 9 ? "9+" : noLeidas}
          </span>
        )}
      </button>

      {abierta && (
        <div className="absolute right-0 z-20 mt-2 max-h-96 w-80 overflow-y-auto rounded-2xl border border-move-green/10 bg-white p-2 shadow-lg">
          {notificaciones.length === 0 ? (
            <p className="px-3 py-4 font-body text-sm text-move-green/50">
              Todavía no tienes notificaciones.
            </p>
          ) : (
            notificaciones.map((n) => (
              <div
                key={n.id}
                className={`rounded-xl px-3 py-2 ${n.leida ? "" : "bg-move-coral/5"}`}
              >
                <p className="font-body text-sm text-move-green/90">
                  <span className="mr-1">{ICONO_POR_TIPO[n.tipo]}</span>
                  {n.mensaje}
                </p>
                <p className="mt-0.5 font-body text-xs text-move-green/40">
                  {tiempoRelativo(n.createdTime)}
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
