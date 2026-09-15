"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

export const COUPON_COOKIE_NAME = "unique_cupon";
const COOKIE_DAYS = 30;

/** Guarda el ?cupon= de la URL (ej. de un anuncio) en una cookie, para que
 * llegue aplicado al checkout sin que la persona lo escriba a mano —
 * sobrevive a que primero cree una cuenta o navegue por gimnasios antes de
 * suscribirse, porque no depende de propagar el parámetro por cada link. */
export default function CouponCapture() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const cupon = searchParams.get("cupon");
    if (!cupon) return;
    const expires = new Date(Date.now() + COOKIE_DAYS * 24 * 60 * 60 * 1000).toUTCString();
    document.cookie = `${COUPON_COOKIE_NAME}=${encodeURIComponent(cupon)}; expires=${expires}; path=/`;
  }, [searchParams]);

  return null;
}
