import { cookies } from "next/headers";

export type Locale = "es" | "en";
export const DEFAULT_LOCALE: Locale = "es";
export const LOCALE_COOKIE = "NEXT_LOCALE";

/** Lee la preferencia de idioma guardada en cookie — nunca hay URLs /en/,
 * solo cambia el contenido que se renderiza. Ver src/lib/i18n/actions.ts
 * para cómo se escribe esta cookie (solo se puede desde un Server
 * Function, no durante el render). */
export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  return store.get(LOCALE_COOKIE)?.value === "en" ? "en" : DEFAULT_LOCALE;
}
