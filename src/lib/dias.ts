export const DAY_KEY_FORMATTER = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" });

const NOMBRES_DIA = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const NOMBRES_MES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

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
export function semanaActual(): DiaTab[] {
  const [yStr, mStr, dStr] = DAY_KEY_FORMATTER.format(new Date()).split("-");
  const hoyUTC = Date.UTC(Number(yStr), Number(mStr) - 1, Number(dStr));
  const diaSemanaISO = (new Date(hoyUTC).getUTCDay() + 6) % 7; // lunes=0 ... domingo=6

  return Array.from({ length: DIAS_VISIBLES }, (_, i) => {
    const fecha = new Date(hoyUTC + i * 86_400_000);
    const y = fecha.getUTCFullYear();
    const m = fecha.getUTCMonth() + 1;
    const d = fecha.getUTCDate();
    const key = `${y}-${pad(m)}-${pad(d)}`;
    const nombre = NOMBRES_DIA[(diaSemanaISO + i) % 7];
    return { key, label: i === 0 ? "Hoy" : nombre, fechaLabel: `${d} de ${NOMBRES_MES[m - 1]}` };
  });
}

export function formatHora(fecha: string): string {
  return new Date(fecha).toLocaleString("es-CO", {
    timeZone: "America/Bogota",
    hour: "numeric",
    minute: "2-digit",
  });
}
