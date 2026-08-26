"use client";

import { useEffect } from "react";
import { trackMetaEvent } from "@/lib/meta-pixel-events";

/** Deduplica con sessionStorage: si el usuario recarga /pagos/resultado con
 * el mismo id de transacción no queremos volver a contar la compra.
 *
 * transactionId se manda como eventId para que Meta deduplique este evento
 * de navegador con el que el webhook de Wompi manda por Conversions API
 * (mismo id de transacción de Wompi en ambos lados). */
export default function PurchaseTracker({
  transactionId,
  value,
}: {
  transactionId: string;
  value: number;
}) {
  useEffect(() => {
    const key = `fb_purchase_${transactionId}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    trackMetaEvent("Purchase", { value, currency: "COP" }, transactionId);
  }, [transactionId, value]);

  return null;
}
