import { getAirtableBase, escapeFormulaValue } from "./airtable";
import { withLock } from "./server-cache";
import { getSubscriptionByEmail } from "./subscriptions";
import { getUserCreditsByEmail } from "./users";
import { getGymById, esGimnasioDeExperiencias } from "./gyms";
import { getClaseByIdBasic } from "./classes";
import { sendPushNotification } from "./push";
import { sendChallengeGanasteEmail, sendPaseGratisPorVencerEmail } from "./email";

/**
 * Challenge UNIQUE — 4 retos que se van llenando con lo que la persona hace;
 * al completarlos gana un pase de clase gratis (7 días para usarlo) y el
 * challenge vuelve a empezar en ese mismo momento con los mismos retos.
 *
 * Solo para quien tiene plan (pagado o regalado — la Prueba UNIQUE y los
 * créditos sueltos no cuentan). El progreso NO se guarda: se recalcula
 * siempre desde Reservas y Referidos a partir del "Inicio" de la ronda, así
 * nunca se desincroniza con lo que de verdad pasó.
 *
 * Esquema en Airtable:
 *   Tabla "Challenge" (una fila por persona y ronda):
 *     - Correo, Ronda (número), Inicio (fecha y hora)
 *     - Estado (selección: "En curso" | "Completada" | "Reiniciada")
 *     - FechaCompletada (fecha y hora)
 *     - UltimaNotificacion (fecha — para no mandar más de 1 aviso de
 *       avance al día)
 *     - UltimoAvisoEnviado (texto — el progreso que ya se le avisó, ej.
 *       "2-1-0-0", para no repetir el mismo aviso)
 *   Tabla "PasesClaseGratis":
 *     - Correo, FechaGanado, FechaVence (fechas)
 *     - Estado (selección: "Disponible" | "Usado" | "Vencido")
 *     - ReservaId (texto — la reserva donde se usó)
 *     - AvisoVencimientoEnviado (casilla)
 *   Tabla "Reservas": PaseGratis (casilla — la reserva se hizo con el pase,
 *     sin descontar créditos; al gimnasio se le liquida igual por el precio
 *     de la clase).
 */
const CHALLENGE_TABLE = "Challenge";
const PASES_TABLE = "PasesClaseGratis";

/** Lo que pase antes del lanzamiento no cuenta — todos arrancan parejos. */
export const CHALLENGE_LANZAMIENTO = new Date("2026-11-24T00:00:00-05:00");
/** Si deja de pagar, el progreso se congela; pasados estos días desde que
 * se le vencen los créditos, se reinicia en cero. */
const DIAS_GRACIA_REINICIO = 5;
const DIAS_VALIDEZ_PASE = 7;

const RETOS = [
  { id: "gimnasios", titulo: "Ve a 3 gimnasios distintos", meta: 3 },
  { id: "disciplinas", titulo: "Prueba 3 disciplinas distintas", meta: 3 },
  { id: "experiencias", titulo: "Vive una experiencia wellness", meta: 1 },
  { id: "referidos", titulo: "Alguien paga su plan con tu código", meta: 1 },
] as const;

export type RetoId = (typeof RETOS)[number]["id"];
export type Reto = { id: RetoId; titulo: string; actual: number; meta: number; completado: boolean };

export type PaseGratis = { id: string; fechaVence: string };

export type EstadoChallenge =
  | { disponible: false }
  | {
      disponible: true;
      /** true mientras dejó de pagar pero todavía está en los días de
       * gracia: se ve el progreso, pero no avanza ni se puede completar. */
      congelado: boolean;
      /** Antes del 24 de nov se muestra, pero todavía no cuenta nada. */
      lanzado: boolean;
      ronda: number;
      retos: Reto[];
      completados: number;
      pase: PaseGratis | null;
      /** Pista de qué le falta, para mostrar debajo de las barras. */
      pista: string | null;
    };

function hoyBogota(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
}

function sumarDias(fechaISO: string, dias: number): string {
  const d = new Date(`${fechaISO.slice(0, 10)}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

export function fechaLargaChallenge(fechaISO: string): string {
  return new Date(`${fechaISO.slice(0, 10)}T12:00:00-05:00`).toLocaleDateString("es-CO", {
    timeZone: "America/Bogota",
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

type Elegibilidad = "activo" | "congelado" | "no";

/** Activo: suscripción "Activa", o tuvo un plan (pagado o regalado —
 * canjear un regalo deja la Suscripción en "Cancelada") y sus créditos
 * todavía no se vencen. Congelado: se le vencieron hace menos de 5 días.
 * La Prueba UNIQUE y quien solo compró créditos sueltos (sin fila en
 * Suscripciones) no tienen challenge. */
async function elegibilidad(correo: string): Promise<Elegibilidad> {
  const sub = await getSubscriptionByEmail(correo);
  if (!sub || sub.estado === "Prueba") return "no";
  if (sub.estado === "Activa") return "activo";
  const cuenta = await getUserCreditsByEmail(correo);
  const vencimiento = cuenta?.vencimiento?.slice(0, 10);
  if (!vencimiento) return "no";
  const hoy = hoyBogota();
  if (hoy <= vencimiento) return "activo";
  if (hoy <= sumarDias(vencimiento, DIAS_GRACIA_REINICIO)) return "congelado";
  return "no";
}

type Ronda = {
  id: string;
  ronda: number;
  inicio: string;
  ultimaNotificacion: string | null;
  ultimoAviso: string | null;
};

async function rondasDe(correo: string) {
  const base = getAirtableBase();
  return base(CHALLENGE_TABLE)
    .select({ filterByFormula: `LOWER({Correo}) = LOWER("${escapeFormulaValue(correo)}")` })
    .all();
}

async function rondaEnCurso(correo: string): Promise<{ actual: Ronda | null; ultimaRonda: number }> {
  const records = await rondasDe(correo);
  const ultimaRonda = Math.max(0, ...records.map((r) => (r.get("Ronda") as number) || 0));
  const enCurso = records
    .filter((r) => r.get("Estado") === "En curso")
    .sort((a, b) => ((b.get("Ronda") as number) || 0) - ((a.get("Ronda") as number) || 0))[0];
  return {
    ultimaRonda,
    actual: enCurso
      ? {
          id: enCurso.id,
          ronda: (enCurso.get("Ronda") as number) || 1,
          inicio: (enCurso.get("Inicio") as string) ?? CHALLENGE_LANZAMIENTO.toISOString(),
          ultimaNotificacion: (enCurso.get("UltimaNotificacion") as string) || null,
          ultimoAviso: (enCurso.get("UltimoAvisoEnviado") as string) || null,
        }
      : null,
  };
}

async function crearRonda(correo: string, ronda: number, inicio: Date): Promise<Ronda> {
  const base = getAirtableBase();
  const inicioISO = new Date(Math.max(inicio.getTime(), CHALLENGE_LANZAMIENTO.getTime())).toISOString();
  const created = await base(CHALLENGE_TABLE).create(
    [{ fields: { Correo: correo, Ronda: ronda, Inicio: inicioISO, Estado: "En curso" } }],
    { typecast: true }
  );
  return { id: created[0].id, ronda, inicio: inicioISO, ultimaNotificacion: null, ultimoAviso: null };
}

/** Cuenta lo que hizo desde `inicioISO`: reservas no canceladas cuya clase
 * ya pasó (no se registra asistencia, así que "fue" = reservó y no
 * canceló), y referidos que pagaron su plan con su código. Una disciplina
 * por clase (la primera "Actividad"); las Experiencias cuentan solo en su
 * propio reto. Las dos sedes de Ring son gimnasios distintos. */
async function calcularProgreso(correo: string, inicioISO: string): Promise<Record<RetoId, number>> {
  const base = getAirtableBase();
  const inicio = new Date(inicioISO).getTime();
  const ahora = Date.now();

  const [reservas, referidos] = await Promise.all([
    base("Reservas")
      .select({ filterByFormula: `LOWER({Correo}) = LOWER("${escapeFormulaValue(correo)}")` })
      .all(),
    base("Referidos")
      .select({ filterByFormula: `LOWER({ReferenteCorreo}) = LOWER("${escapeFormulaValue(correo)}")` })
      .all(),
  ]);

  const gimnasios = new Set<string>();
  const disciplinas = new Set<string>();
  let experiencias = 0;

  for (const r of reservas) {
    const estado = String(r.get("Estado") ?? "").trim();
    if (estado.startsWith("Cancelado")) continue;
    const fecha = r.get("Fecha") as string | undefined;
    if (!fecha) continue;
    const t = new Date(fecha).getTime();
    if (t < inicio || t > ahora) continue;

    const gimnasioId = (r.get("Gimnasios") as string[] | undefined)?.[0];
    const claseId = (r.get("Clase") as string[] | undefined)?.[0];
    const gym = gimnasioId ? await getGymById(gimnasioId) : null;
    if (gym && esGimnasioDeExperiencias(gym.name)) {
      experiencias += 1;
      continue;
    }
    if (gimnasioId) gimnasios.add(gimnasioId);
    const clase = claseId ? await getClaseByIdBasic(claseId) : null;
    if (clase?.actividad) disciplinas.add(clase.actividad.toLowerCase());
  }

  const inicioDia = new Date(inicio).toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
  const referidosValidos = referidos.filter((r) => {
    const f = (r.get("FechaOtorgado") as string | undefined)?.slice(0, 10);
    return Boolean(f && f >= inicioDia);
  }).length;

  return {
    gimnasios: gimnasios.size,
    disciplinas: disciplinas.size,
    experiencias,
    referidos: referidosValidos,
  };
}

function armarRetos(progreso: Record<RetoId, number>): Reto[] {
  return RETOS.map((r) => ({
    id: r.id,
    titulo: r.titulo,
    meta: r.meta,
    actual: Math.min(progreso[r.id], r.meta),
    completado: progreso[r.id] >= r.meta,
  }));
}

function pistaPara(retos: Reto[]): string | null {
  const falta = retos.filter((r) => !r.completado);
  if (falta.length === 0) return null;
  const casi = falta.find((r) => r.meta > 1 && r.meta - r.actual === 1);
  if (casi?.id === "gimnasios") return "💪 ¡Te falta 1 gimnasio! Reserva en uno donde no hayas ido.";
  if (casi?.id === "disciplinas") return "💪 ¡Te falta 1 disciplina! Prueba algo nuevo esta semana.";
  const r = falta[0];
  if (r.id === "experiencias") return "🌿 Reserva una experiencia wellness y completa ese reto.";
  if (r.id === "referidos") return "🤝 Comparte tu código: cuando alguien pague su plan con él, completas el reto.";
  if (r.id === "gimnasios") return "📍 Ve a gimnasios distintos para llenar esta barra.";
  return "🔥 Prueba disciplinas distintas: Hyrox, Pilates, Boxing, Yoga…";
}

async function crearPase(correo: string): Promise<PaseGratis> {
  const base = getAirtableBase();
  const hoy = hoyBogota();
  const fechaVence = sumarDias(hoy, DIAS_VALIDEZ_PASE);
  const created = await base(PASES_TABLE).create(
    [{ fields: { Correo: correo, FechaGanado: hoy, FechaVence: fechaVence, Estado: "Disponible" } }],
    { typecast: true }
  );
  return { id: created[0].id, fechaVence };
}

/** El pase "Disponible" y no vencido de esta persona, si tiene. */
export async function getPaseDisponible(correo: string): Promise<PaseGratis | null> {
  const base = getAirtableBase();
  const records = await base(PASES_TABLE)
    .select({
      filterByFormula: `AND(LOWER({Correo}) = LOWER("${escapeFormulaValue(correo)}"), {Estado} = "Disponible")`,
    })
    .all();
  const hoy = hoyBogota();
  const vigente = records
    .map((r) => ({ id: r.id, fechaVence: ((r.get("FechaVence") as string) ?? "").slice(0, 10) }))
    .filter((p) => p.fechaVence && p.fechaVence >= hoy)
    .sort((a, b) => a.fechaVence.localeCompare(b.fechaVence))[0];
  return vigente ?? null;
}

export async function marcarPaseUsado(paseId: string, reservaId: string): Promise<void> {
  const base = getAirtableBase();
  await base(PASES_TABLE).update([{ id: paseId, fields: { Estado: "Usado", ReservaId: reservaId } }], {
    typecast: true,
  });
}

/** Canceló a tiempo la reserva hecha con el pase: se le devuelve si todavía
 * no se le venció (si ya pasó la fecha, queda vencido). */
export async function devolverPaseDeReserva(reservaId: string): Promise<void> {
  const base = getAirtableBase();
  const records = await base(PASES_TABLE)
    .select({ filterByFormula: `{ReservaId} = "${escapeFormulaValue(reservaId)}"`, maxRecords: 1 })
    .all();
  const pase = records[0];
  if (!pase) return;
  const vence = ((pase.get("FechaVence") as string) ?? "").slice(0, 10);
  const vigente = vence >= hoyBogota();
  await base(PASES_TABLE).update(
    [{ id: pase.id, fields: { Estado: vigente ? "Disponible" : "Vencido", ReservaId: "" } }],
    { typecast: true }
  );
}

async function avisarGanaste(correo: string, pase: PaseGratis): Promise<void> {
  const cuenta = await getUserCreditsByEmail(correo);
  const venceLabel = fechaLargaChallenge(pase.fechaVence);
  await sendPushNotification({
    to: cuenta?.pushToken ?? null,
    title: "🎁 ¡Ganaste una clase gratis!",
    body: `Completaste tu Challenge UNIQUE. Úsala donde quieras antes del ${venceLabel}.`,
    data: { type: "challenge-ganaste" },
  });
  await sendChallengeGanasteEmail({
    userEmail: correo,
    nombre: cuenta?.nombre?.split(" ")[0] || "",
    venceLabel,
  }).catch(() => {});
}

/**
 * Calcula el estado del challenge de una persona y, de paso, lo hace
 * avanzar: crea su primera ronda si le toca, la completa (pase gratis +
 * ronda nueva desde ya) si llenó los 4 retos, o la reinicia si dejó de
 * pagar hace más de 5 días. Lo llaman el perfil (web y app) y el cron
 * diario — así se completa apenas lo vea, sin esperar al cron.
 */
export async function evaluarChallenge(correo: string): Promise<EstadoChallenge> {
  return withLock(`challenge:${correo.toLowerCase()}`, async () => {
    const elig = await elegibilidad(correo);
    const base = getAirtableBase();
    const enCurso = await rondaEnCurso(correo);
    const { ultimaRonda } = enCurso;
    let { actual } = enCurso;

    if (elig === "no") {
      if (actual) {
        await base(CHALLENGE_TABLE).update([{ id: actual.id, fields: { Estado: "Reiniciada" } }], {
          typecast: true,
        });
      }
      return { disponible: false };
    }

    if (!actual) {
      if (elig === "congelado") return { disponible: false };
      actual = await crearRonda(correo, ultimaRonda + 1, new Date());
    }

    const lanzado = Date.now() >= CHALLENGE_LANZAMIENTO.getTime();
    let retos = armarRetos(lanzado ? await calcularProgreso(correo, actual.inicio) : {
      gimnasios: 0,
      disciplinas: 0,
      experiencias: 0,
      referidos: 0,
    });

    if (elig === "activo" && lanzado && retos.every((r) => r.completado)) {
      await base(CHALLENGE_TABLE).update(
        [{ id: actual.id, fields: { Estado: "Completada", FechaCompletada: new Date().toISOString() } }],
        { typecast: true }
      );
      const pase = await crearPase(correo);
      await avisarGanaste(correo, pase).catch(() => {});
      actual = await crearRonda(correo, actual.ronda + 1, new Date());
      retos = armarRetos({ gimnasios: 0, disciplinas: 0, experiencias: 0, referidos: 0 });
    }

    return {
      disponible: true,
      congelado: elig === "congelado",
      lanzado,
      ronda: actual.ronda,
      retos,
      completados: retos.filter((r) => r.completado).length,
      pase: await getPaseDisponible(correo),
      pista: elig === "congelado" ? null : pistaPara(retos),
    };
  });
}

/** Aviso de avance (push) — máximo 1 al día, y solo si cambió algo desde el
 * último aviso. Prioriza "te falta 1" sobre "avanzaste". */
async function avisarAvance(correo: string, estado: Extract<EstadoChallenge, { disponible: true }>): Promise<boolean> {
  const { actual } = await rondaEnCurso(correo);
  if (!actual) return false;
  const firma = estado.retos.map((r) => r.actual).join("-");
  if (firma === "0-0-0-0" || firma === actual.ultimoAviso) return false;
  const hoy = hoyBogota();
  if (actual.ultimaNotificacion?.slice(0, 10) === hoy) return false;

  const casi = estado.retos.find((r) => !r.completado && r.meta > 1 && r.meta - r.actual === 1);
  const body = casi
    ? `💪 ¡Te falta 1 ${casi.id === "gimnasios" ? "gimnasio" : "disciplina"} para tu reto! Ya casi lo logras.`
    : `🔥 ¡Avanzaste en tu Challenge UNIQUE! Llevas ${estado.completados} de 4 retos.`;

  const cuenta = await getUserCreditsByEmail(correo);
  await sendPushNotification({
    to: cuenta?.pushToken ?? null,
    title: "Challenge UNIQUE",
    body,
    data: { type: "challenge-avance" },
  });
  const base = getAirtableBase();
  await base(CHALLENGE_TABLE).update(
    [{ id: actual.id, fields: { UltimaNotificacion: hoy, UltimoAvisoEnviado: firma } }],
    { typecast: true }
  );
  return true;
}

/** Cron diario: evalúa a todos los que tienen o tuvieron plan (completa,
 * reinicia, avisa avances), vence los pases que pasaron su fecha y avisa
 * los que vencen en 2 días (push + correo). */
export async function correrCronChallenge(): Promise<{
  evaluados: number;
  avisos: number;
  pasesVencidos: number;
  avisosVencimiento: number;
  fallidos: string[];
}> {
  const base = getAirtableBase();
  const [subs, rondas] = await Promise.all([
    base("Suscripciones").select().all(),
    base(CHALLENGE_TABLE).select({ filterByFormula: `{Estado} = "En curso"` }).all(),
  ]);
  const correos = new Set<string>();
  for (const s of subs) {
    const c = String(s.get("Correo") ?? "").trim().toLowerCase();
    if (c && s.get("Estado") !== "Prueba") correos.add(c);
  }
  for (const r of rondas) {
    const c = String(r.get("Correo") ?? "").trim().toLowerCase();
    if (c) correos.add(c);
  }

  let evaluados = 0;
  let avisos = 0;
  const fallidos: string[] = [];
  for (const correo of correos) {
    try {
      const estado = await evaluarChallenge(correo);
      evaluados += 1;
      if (estado.disponible && estado.lanzado && !estado.congelado && (await avisarAvance(correo, estado))) {
        avisos += 1;
      }
    } catch (err) {
      fallidos.push(`${correo}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const hoy = hoyBogota();
  const enDosDias = sumarDias(hoy, 2);
  const pases = await base(PASES_TABLE).select({ filterByFormula: `{Estado} = "Disponible"` }).all();
  let pasesVencidos = 0;
  let avisosVencimiento = 0;
  for (const p of pases) {
    const vence = ((p.get("FechaVence") as string) ?? "").slice(0, 10);
    const correo = String(p.get("Correo") ?? "");
    try {
      if (vence && vence < hoy) {
        await base(PASES_TABLE).update([{ id: p.id, fields: { Estado: "Vencido" } }], { typecast: true });
        pasesVencidos += 1;
      } else if (vence && vence <= enDosDias && !p.get("AvisoVencimientoEnviado")) {
        const cuenta = await getUserCreditsByEmail(correo);
        const venceLabel = fechaLargaChallenge(vence);
        await sendPushNotification({
          to: cuenta?.pushToken ?? null,
          title: "⏳ Tu clase gratis vence pronto",
          body: `Úsala antes del ${venceLabel}. ¡No la dejes ir!`,
          data: { type: "challenge-pase-vence" },
        });
        await sendPaseGratisPorVencerEmail({
          userEmail: correo,
          nombre: cuenta?.nombre?.split(" ")[0] || "",
          venceLabel,
        }).catch(() => {});
        await base(PASES_TABLE).update([{ id: p.id, fields: { AvisoVencimientoEnviado: true } }], {
          typecast: true,
        });
        avisosVencimiento += 1;
      }
    } catch (err) {
      fallidos.push(`pase ${p.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return { evaluados, avisos, pasesVencidos, avisosVencimiento, fallidos };
}
