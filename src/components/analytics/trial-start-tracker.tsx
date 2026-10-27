"use client";

import { useEffect } from "react";
import { trackMetaEvent } from "@/lib/meta-pixel-events";

/** Dispara el evento estándar "StartTrial" del píxel de Meta apenas se
 * aprueba el pago de la Prueba UNIQUE — mismo criterio que SubscribeTracker:
 * se monta solo cuando el pago ya se confirmó, no al cargar el checkout. */
export default function TrialStartTracker({ value }: { value: number }) {
  useEffect(() => {
    trackMetaEvent("StartTrial", { value, currency: "COP", predicted_ltv: value });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
