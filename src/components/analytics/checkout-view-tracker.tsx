"use client";

import { useEffect } from "react";
import { trackMetaEvent } from "@/lib/meta-pixel-events";

export default function CheckoutViewTracker({
  planId,
  planName,
  value,
}: {
  planId: string;
  planName: string;
  value: number;
}) {
  useEffect(() => {
    trackMetaEvent("InitiateCheckout", {
      content_ids: [planId],
      content_name: planName,
      value,
      currency: "COP",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId]);

  return null;
}
