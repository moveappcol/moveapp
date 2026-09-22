"use client";

import { useTransition } from "react";
import { setLocale } from "@/lib/i18n/actions";
import type { Locale } from "@/lib/i18n/locale";

export default function LanguageToggle({
  locale,
  dark = false,
}: {
  locale: Locale;
  dark?: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  function switchTo(next: Locale) {
    if (next === locale || isPending) return;
    startTransition(() => {
      setLocale(next);
    });
  }

  const base = "rounded-full px-2.5 py-1 font-heading text-xs font-semibold transition-colors";
  const activeCls = dark ? "bg-white text-move-green" : "bg-move-green text-white";
  const inactiveCls = dark
    ? "text-white/70 hover:text-white"
    : "text-move-green/60 hover:text-move-green";

  return (
    <div
      className={`flex items-center gap-0.5 rounded-full p-0.5 ${
        dark ? "border border-white/20" : "border border-move-green/15"
      }`}
      aria-label="Selector de idioma / Language selector"
    >
      <button
        type="button"
        onClick={() => switchTo("es")}
        className={`${base} ${locale === "es" ? activeCls : inactiveCls}`}
      >
        ES
      </button>
      <button
        type="button"
        onClick={() => switchTo("en")}
        className={`${base} ${locale === "en" ? activeCls : inactiveCls}`}
      >
        EN
      </button>
    </div>
  );
}
