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

const BOGOTA_HOUR_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Bogota",
  hour: "numeric",
  hour12: false,
});

/** Hora del día (0–23) de una fecha, en hora de Bogotá — para agrupar
 * clases en rangos horarios (5–7, 7–10, etc.) sin depender de la zona
 * horaria de quien ejecuta el código. */
export function bogotaHour(fecha: string): number {
  return Number(BOGOTA_HOUR_FORMATTER.format(new Date(fecha)));
}

export type RangoHorario = { key: string; startHour: number; endHour: number };

/** Rangos fijos para el filtro de horario del explorador "por día" —
 * cubren de 5 a.m. a 10 p.m., que es la ventana real en que los
 * gimnasios afiliados programan clases. */
export const RANGOS_HORARIO: RangoHorario[] = [
  { key: "5-7", startHour: 5, endHour: 7 },
  { key: "7-10", startHour: 7, endHour: 10 },
  { key: "10-13", startHour: 10, endHour: 13 },
  { key: "13-16", startHour: 13, endHour: 16 },
  { key: "16-19", startHour: 16, endHour: 19 },
  { key: "19-22", startHour: 19, endHour: 22 },
];

/** Bogotá no tiene horario de verano (siempre UTC-5), así que basta con
 * construir la hora directamente en UTC+5 para representar esa hora
 * "de reloj" en Bogotá, sin pasar por el huso horario de quien ejecuta
 * el código. */
function formatHourLabel(hour: number, locale: Locale): string {
  const d = new Date(Date.UTC(2000, 0, 1, hour + 5, 0));
  return d
    .toLocaleTimeString(locale === "en" ? "en-US" : "es-CO", {
      timeZone: "America/Bogota",
      hour: "numeric",
    })
    .replace(/\s?[ap]\.?\s?m\.?/i, (m) => m.trim().toLowerCase());
}

export function formatRangoHorario(rango: RangoHorario, locale: Locale): string {
  return `${formatHourLabel(rango.startHour, locale)} – ${formatHourLabel(rango.endHour, locale)}`;
}
