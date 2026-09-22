import { es } from "./es";
import { en } from "./en";
import type { Locale } from "../locale";
import type { Dictionary } from "./es";

export type { Dictionary };

const dictionaries: Record<Locale, Dictionary> = { es, en };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}
