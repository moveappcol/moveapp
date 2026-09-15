"use client";

import { useEffect } from "react";
import { trackMetaEvent } from "@/lib/meta-pixel-events";

/** Dispara el evento estándar "Subscribe" del píxel de Meta apenas se
 * aprueba una suscripción — no en la carga de la página de checkout (ahí
 * todavía no se sabe si la persona va a pagar), sino cuando el pago
 * realmente se confirma. */
export default function SubscribeTracker({ value }: { value: number }) {
  useEffect(() => {
    trackMetaEvent("Subscribe", { value, currency: "COP" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
