"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/** En Android/Chrome, este evento nos da el diálogo nativo de instalación
 * -- un solo clic en "Instalar" y listo. En iPhone, Apple no expone ninguna
 * API para disparar "Agregar a pantalla de inicio" desde código: ahí no
 * queda otra que mandar a la guía de pasos manuales. */
export default function InstallAppButton() {
  const router = useRouter();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  // El servidor no tiene matchMedia — ahí simplemente asumimos "no
  // instalado" (el botón se muestra) y, si el cliente ya lo tenía
  // instalado como PWA, se oculta apenas hidrata.
  const [installed, setInstalled] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(display-mode: standalone)").matches
  );

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
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
