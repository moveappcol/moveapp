"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import Clarity from "@microsoft/clarity";

/** Etiqueta la grabación de sesión de Clarity con el correo real de quien
 * está logueado — sin esto, Clarity graba igual, pero cada sesión queda
 * anónima y no se puede buscar "las sesiones de fulanita@gmail.com" desde
 * el panel de Clarity. No hace falta Clarity.init() acá: MicrosoftClarity
 * (el script en layout.tsx) ya deja listo `window.clarity`, que es lo
 * único que Clarity.identify() necesita por debajo — llamar init() de
 * nuevo aquí solo duplicaría la inyección del script. */
export default function ClarityIdentify() {
  const { isSignedIn, user } = useUser();

  useEffect(() => {
    if (!isSignedIn) return;
    // Si NEXT_PUBLIC_CLARITY_PROJECT_ID no está configurado, MicrosoftClarity
    // nunca inyecta el script y `window.clarity` no existe — llamarlo ahí
    // reventaría. Clarity.identify() no hace ese chequeo por su cuenta.
    const clarity = (window as typeof window & { clarity?: unknown }).clarity;
    if (typeof clarity !== "function") return;
    const email = user.primaryEmailAddress?.emailAddress;
    if (!email) return;
    Clarity.identify(email);
  }, [isSignedIn, user]);

  return null;
}
