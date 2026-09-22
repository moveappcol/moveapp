import type { Locale } from "./i18n/locale";

export const DAY_KEY_FORMATTER = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" });

const NOMBRES_DIA: Record<Locale, string[]> = {
  es: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"],
  en: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
};
const NOMBRES_MES: Record<Locale, string[]> = {
  es: [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
  ],
  en: [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ],
};
const HOY_LABEL: Record<Locale, string> = { es: "Hoy", en: "Today" };

export type DiaTab = { key: string; label: string; fechaLabel: string };

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

const DIAS_VISIBLES = 7;

/** Ventana rodante: "Hoy" primero, seguido de los siguientes 6 días —
 * siempre 7 días hacia adelante sin importar qué día de la semana sea hoy
 * (antes se cortaba en el domingo de esta semana, lo que escondía una
 * clase cargada, por ejemplo, un miércoles para el martes siguiente hasta
 * que llegara el lunes). Se recalcula solo con la fecha de hoy, así que
 * rueda sola sin ningún cambio de código. Toda la aritmética es en UTC "de
 * calendario" (sin horas) para no depender de la zona horaria de quien
 * ejecuta el código. */
export function semanaActual(locale: Locale = "es"): DiaTab[] {
  const [yStr, mStr, dStr] = DAY_KEY_FORMATTER.format(new Date()).split("-");
  const hoyUTC = Date.UTC(Number(yStr), Number(mStr) - 1, Number(dStr));
  const diaSemanaISO = (new Date(hoyUTC).getUTCDay() + 6) % 7; // lunes=0 ... domingo=6

  return Array.from({ length: DIAS_VISIBLES }, (_, i) => {
    const fecha = new Date(hoyUTC + i * 86_400_000);
    const y = fecha.getUTCFullYear();
    const m = fecha.getUTCMonth() + 1;
    const d = fecha.getUTCDate();
    const key = `${y}-${pad(m)}-${pad(d)}`;
    const nombre = NOMBRES_DIA[locale][(diaSemanaISO + i) % 7];
    const mes = NOMBRES_MES[locale][m - 1];
    const fechaLabel = locale === "en" ? `${mes} ${d}` : `${d} de ${mes}`;
    return { key, label: i === 0 ? HOY_LABEL[locale] : nombre, fechaLabel };
  });
}

export function formatHora(fecha: string, locale: Locale = "es"): string {
  return new Date(fecha).toLocaleString(locale === "en" ? "en-US" : "es-CO", {
    timeZone: "America/Bogota",
    hour: "numeric",
    minute: "2-digit",
  });
}
