"use client";

import { useEffect } from "react";
import { trackMetaEvent } from "@/lib/meta-pixel-events";

export default function CheckoutViewTracker({
  planId,
  planName,
  value,
  eventId,
}: {
  planId: string;
  planName: string;
  value: number;
  /** Mismo id que se mandó por Conversions API desde el servidor (ver
   * sendMetaInitiateCheckoutEvent) — para que Meta deduplique ambos avisos
   * del mismo evento en vez de contarlo dos veces. */
  eventId: string;
}) {
  useEffect(() => {
    trackMetaEvent(
      "InitiateCheckout",
      { content_ids: [planId], content_name: planName, value, currency: "COP" },
      eventId
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId, eventId]);

  return null;
}
