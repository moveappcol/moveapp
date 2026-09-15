"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

declare global {
  interface Window {
    __uniqueInstallPrompt?: BeforeInstallPromptEvent;
  }
}

/** En Android/Chrome, este evento nos da el diálogo nativo de instalación
 * -- un solo clic en "Instalar" y listo. En iPhone, Apple no expone ninguna
 * API para disparar "Agregar a pantalla de inicio" desde código: ahí no
 * queda otra que mandar a la guía de pasos manuales. */
export default function InstallAppButton() {
  const router = useRouter();
  // El servidor no tiene matchMedia — ahí simplemente asumimos "no
  // instalado" (el botón se muestra) y, si el cliente ya lo tenía
  // instalado como PWA, se oculta apenas hidrata.
  const [installed, setInstalled] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(display-mode: standalone)").matches
  );
  // beforeinstallprompt dispara una sola vez por carga de página, y a veces
  // llega antes de que React termine de hidratar -- si solo lo
  // escucháramos con addEventListener en un efecto, ya lo habríamos
  // perdido para siempre. El script inline en layout.tsx
  // (strategy="beforeInteractive") lo agarra apenas carga el HTML, mucho
  // antes que este componente, y lo deja guardado en
  // window.__uniqueInstallPrompt -- lo leemos acá, en el primer render.
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(() => {
    if (typeof window === "undefined") return null;
    if (/SamsungBrowser/i.test(navigator.userAgent)) return null;
    return window.__uniqueInstallPrompt ?? null;
  });

  useEffect(() => {
    const isSamsungInternet = /SamsungBrowser/i.test(navigator.userAgent);

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      window.__uniqueInstallPrompt = e as BeforeInstallPromptEvent;
      // Samsung Internet (y otros navegadores de fábrica en Android) generan
      // su propio instalador con metadatos de una versión vieja de Android,
      // y Play Protect lo bloquea como "app no segura" -- el de Chrome no
      // tiene ese problema. Por eso acá no lo guardamos: dejamos que
      // handleClick mande a esos navegadores directo a Chrome en vez de
      // intentar el instalador roto.
      if (isSamsungInternet) return;
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstalled(true);

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  const handleClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") setInstalled(true);
      setDeferredPrompt(null);
      delete window.__uniqueInstallPrompt;
      return;
    }
    if (/SamsungBrowser/i.test(navigator.userAgent)) {
      const url = `${window.location.origin}/instalar`;
      window.location.href = `intent://${url.replace(/^https?:\/\//, "")}#Intent;scheme=https;package=com.android.chrome;end;`;
      return;
    }
    router.push("/instalar");
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex items-center gap-2 rounded-full bg-move-green px-6 py-3 font-heading text-sm font-semibold text-white transition-opacity hover:opacity-90"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-white stroke-[2.2]">
        <path d="M12 3v13" strokeLinecap="round" />
        <path d="M7 11l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5 20h14" strokeLinecap="round" />
      </svg>
      Descargar app
    </button>
  );
}
