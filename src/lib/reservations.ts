import { getAirtableBase, escapeFormulaValue } from "./airtable";
import { getUserCreditsByEmail, deductCredits, addCredits } from "./users";
import { getClaseById, precioEfectivo, invalidateClasesCupos, getAllClasesDeTodosLosGimnasios } from "./classes";
import {
  getGymById,
  getGyms,
  canAccessGymByGenero,
  DEFAULT_BOOKING_CUTOFF_MINUTES,
  reservationsAreOpen,
  reservationsOpenLabel,
} from "./gyms";
import { sendLowRatingAlertEmail, sendNewReservationEmail, sendWaitlistPromotedEmail } from "./email";
import { getWaitingInOrder, markWaitlistPromoted, getAllWaitingEntries } from "./waitlist";
import { sendPushNotification } from "./push";

const OWNER_EMAIL = "uniqueappcol@gmail.com";
const LOW_RATING_THRESHOLD = 3;

export type BookingResult =
  | { ok: true; reservationId: string; remainingCredits: number }
  | { ok: false; error: string; code?: "perfil_incompleto" | "ya_reservada" };

export type CancelResult =
  | { ok: true; refunded: boolean }
  | { ok: false; error: string };

export type ReservationParams = {
  userEmail: string;
  userName: string;
  claseId: string;
  gimnasioId: string;
  claseCredits: number;
  fechaISO: string;
  /** Texto libre y opcional — dolores o molestias que la persona quiere que
   * el gimnasio tenga en cuenta para esa clase. Va tal cual en el PDF de
   * "reservas finales" que recibe el gimnasio (ver pdf.tsx). */
  molestias?: string;
};

export type Reservation = {
  id: string;
  claseId: string | null;
  gimnasioId: string | null;
  fecha: string | null;
  estado: string | null;
  correo: string | null;
  calificacion: number | null;
  comentario: string | null;
};

export type ReservaDetalle = {
  id: string;
  userName: string;
  estado: string;
  cedula: string;
  correo: string;
  molestias: string;
  recordatorioEnviado: boolean;
  correoDespuesClaseEnviado: boolean;
};

type ReservaConClaseYFecha = ReservaDetalle & { claseId: string; fecha: string | null };

function mapReservaRecord(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  r: any
): ReservaConClaseYFecha {
  return {
    id: r.id,
    claseId: (r.get("Clase") as string[] | undefined)?.[0] ?? "",
    fecha: (r.get("Fecha") as string) ?? null,
    userName: ((r.get("Usuario") as string) ?? "Desconocido").trim(),
    estado: ((r.get("Estado") as string) ?? "Reservado").trim(),
    cedula: ((r.get("Cedula") as string) ?? "").trim(),
    correo: ((r.get("Correo") as string) ?? "").trim(),
    molestias: ((r.get("Molestias") as string) ?? "").trim(),
    recordatorioEnviado: Boolean(r.get("Recordatorio enviado")),
    correoDespuesClaseEnviado: Boolean(r.get("Correo despues clase enviado")),
  };
}

/** Trae TODAS las reservas una sola vez. Los crons que recorren muchas
 * clases en un mismo run deben llamar esto UNA vez y filtrar en memoria con
 * `filterReservationsDetailForClase` — hacer una llamada nueva a Airtable
 * (trayendo la tabla completa) por cada clase fue lo que tumbó el cron de
 * liquidaciones por quedarse sin memoria (confirmado en producción:
 * contenedor reiniciándose por OOM cada pocas corridas). */
export async function fetchAllReservasDetalle(): Promise<ReservaConClaseYFecha[]> {
  const base = getAirtableBase();
  const records = await base("Reservas").select().all();
  return records.map(mapReservaRecord);
}

/** Filtra en memoria (sin llamar a Airtable) las reservas de una clase
 * específica, a partir de lo que trajo fetchAllReservasDetalle.
 *
 * `fechaEsperada` (el `fecha` real de la clase, ISO) es un segundo filtro
 * obligatorio, no cosmético: hay reservas viejas (de antes de que existiera
 * el flujo real de reservar) cuyo campo "Clase" quedó enlazado a decenas de
 * clases en vez de una sola — filtrar solo por `Clase[0] === claseId` hacía
 * que esas reservas aparecieran en la lista de asistentes de clases que esa
 * persona nunca reservó de verdad (confirmado en producción: gente
 * apareciendo en listas de clases ajenas). El campo "Fecha" de la reserva sí
 * queda confiable — se guarda igual a `clase.fecha` al momento de reservar
 * (ver createReservation) — así que cruzarlo descarta esas reservas mal
 * enlazadas sin tener que arreglar cada fila vieja a mano. */
export function filterReservationsDetailForClase(
  todas: ReservaConClaseYFecha[],
  claseId: string,
  fechaEsperada: string
): ReservaDetalle[] {
  return todas.filter((r) => r.claseId === claseId && r.fecha === fechaEsperada);
}

/** Todas las reservas de una clase (cualquier estado), para armar el
 * reporte de liquidación. Trae la tabla completa cada vez que se llama —
 * bien para un uso puntual (ej. el webhook de corrección, que solo procesa
 * una clase por invocación), pero un cron que recorre muchas clases en el
 * mismo run debe usar fetchAllReservasDetalle + filterReservationsDetailForClase
 * en su lugar (ver el comentario ahí). */
export async function getReservationsDetailForClase(
  claseId: string,
  fechaEsperada: string
): Promise<ReservaDetalle[]> {
  const todas = await fetchAllReservasDetalle();
  return filterReservationsDetailForClase(todas, claseId, fechaEsperada);
}

/** Marca que ya se le mandó el recordatorio de 3h antes a esta reserva —
 * evita reenviarlo si el cron corre varias veces dentro de la ventana. */
export async function markRecordatorioEnviado(reservationId: string): Promise<void> {
  const base = getAirtableBase();
  await base("Reservas").update([{ id: reservationId, fields: { "Recordatorio enviado": true } }], {
    typecast: true,
  });
}

/** Marca que ya se le mandó el correo "AFTER CLASS" a esta reserva — evita
 * reenviarlo si el cron corre varias veces dentro de la ventana. */
export async function markCorreoDespuesClaseEnviado(reservationId: string): Promise<void> {
  const base = getAirtableBase();
  await base("Reservas").update(
    [{ id: reservationId, fields: { "Correo despues clase enviado": true } }],
    { typecast: true }
  );
}

const CANCELLATION_WINDOW_HOURS = 24;
const MAX_MONTHLY_RESERVATIONS_PER_GYM = 3;

/** "Y-M" del mes de una fecha en hora de Bogotá (no la del proceso del
 * servidor, que en producción puede no ser America/Bogota). */
function toBogotaMonthKey(iso: string): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
  });
  const parts = fmt.formatToParts(new Date(iso));
  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  return `${year}-${month}`;
}

/** Cuántas reservas tiene esta persona en este gimnasio, en el mes de la
 * clase que quiere reservar — sin contar las que canceló a tiempo (esas no
 * le "cuentan" un cupo). Se filtra en JS por el mismo motivo que en otros
 * lugares del código: no es confiable filtrar por fecha/link en una fórmula
 * de Airtable. */
/** Antes traía TODA la tabla Reservas (select().all() sin filtro) cada vez
 * que CUALQUIER persona intentaba reservar CUALQUIER clase — con la tabla
 * creciendo eso se volvió una de las causas principales de que la cuenta
 * de Airtable se pasara del límite mensual de llamadas (aparte del límite
 * aparte de 5 llamadas/segundo por base, que también se dispara más fácil
 * mientras más llamadas caras como esta hace la app). Ahora Airtable filtra
 * por Usuario+Estado del lado del servidor — el resto (gimnasio, mes) se
 * sigue filtrando en JS porque ARRAYJOIN sobre el campo de link concatena
 * el NOMBRE del gimnasio vinculado, no su id, así que no se puede filtrar
 * por gimnasioId directo en la fórmula. */
async function countMonthlyReservationsAtGym(
  userName: string,
  gimnasioId: string,
  monthKey: string
): Promise<number> {
  const base = getAirtableBase();
  const records = await base("Reservas")
    .select({
      // TRIM() porque el valor real en Airtable trae un espacio al final
      // ("Cancelado on time "), como en otros campos de selección de esta
      // base — el código original lo manejaba con .trim() en JS después de
      // traer todo; acá hay que pedírselo a la fórmula, si no compara mal.
      filterByFormula: `AND({Usuario} = "${escapeFormulaValue(userName)}", TRIM({Estado}) != "Cancelado on time")`,
    })
    .all();
  return records.filter((r) => {
    const gimnasios = r.get("Gimnasios") as string[] | undefined;
    if (!gimnasios?.includes(gimnasioId)) return false;

    const fecha = r.get("Fecha") as string | undefined;
    if (!fecha || toBogotaMonthKey(fecha) !== monthKey) return false;

    return true;
  }).length;
}

/**
 * Esquema en Airtable — tabla "Reservas":
 *   - Usuario    (texto — nombre de quien reserva)
 *   - Clase      (link a Clases)
 *   - Gimnasios  (link a Gimnasios)
 *   - Fecha      (fecha y hora)
 *   - Estado     (selección: "Reservado", "Cancelado on time", "Asistió", "No asistió", ...)
 *   - Cedula     (texto — copiada del perfil del usuario al reservar)
 *   - Correo     (texto — copiado de la cuenta del usuario al reservar)
 *   - "Recordatorio enviado" (casilla — evita reenviar el correo de 3h antes
 *      cuando el cron corre varias veces dentro de la ventana)
 *   - "Correo despues clase enviado" (casilla — evita reenviar el correo
 *      "AFTER CLASS" cuando el cron corre varias veces dentro de la ventana)
 *   - Calificación (número 1–5 — opcional, la pone el usuario desde "Mis
 *      reservas" hasta 24h después de terminada la clase)
 *   - Comentario    (texto largo, opcional — junto con la calificación)
 *   - Molestias     (texto largo, opcional — dolores o molestias que la
 *      persona quiere que el gimnasio tenga en cuenta; sale en el PDF de
 *      "reservas finales" que recibe el gimnasio)
 *
 * Puede seguir existiendo un campo "Tipo" acá de cuando esta clasificación
 * vivía por reserva — ya no se lee: el Tipo A/B es del cupo de la clase
 * (ver TipoClase en classes.ts), no de cada persona que la reserva.
 */
export async function createReservation(params: ReservationParams): Promise<BookingResult> {
  const { userEmail, userName, claseId, gimnasioId, claseCredits, fechaISO, molestias } = params;

  if (!reservationsAreOpen()) {
    return {
      ok: false,
      error: `Todavía estamos cargando los cupos — las reservas abren el ${reservationsOpenLabel()}.`,
    };
  }

  const gym = await getGymById(gimnasioId);
  const bookingCutoffMinutes = gym?.bookingCutoffMinutes ?? DEFAULT_BOOKING_CUTOFF_MINUTES;
  const minutesUntilClass = (new Date(fechaISO).getTime() - Date.now()) / (1000 * 60);
  if (minutesUntilClass < bookingCutoffMinutes) {
    return {
      ok: false,
      error: `Las reservas para esta clase cierran ${bookingCutoffMinutes} minutos antes de que empiece.`,
    };
  }

  const account = await getUserCreditsByEmail(userEmail);
  if (!account) {
    return {
      ok: false,
      error: "No encontramos un plan de créditos activo para tu cuenta todavía.",
    };
  }
  if (account.credits < claseCredits) {
    return {
      ok: false,
      error: `No tienes créditos suficientes: te quedan ${account.credits} y esta clase vale ${claseCredits}.`,
    };
  }
  if (!account.cedula) {
    return {
      ok: false,
      error: "Completa tu perfil (cédula) antes de reservar.",
      code: "perfil_incompleto",
    };
  }
  if (gym && !canAccessGymByGenero(gym.genero, account.genero)) {
    return {
      ok: false,
      error: "Este gimnasio no está disponible para tu perfil.",
    };
  }

  const monthlyCount = await countMonthlyReservationsAtGym(
    userName,
    gimnasioId,
    toBogotaMonthKey(fechaISO)
  );
  if (monthlyCount >= MAX_MONTHLY_RESERVATIONS_PER_GYM) {
    return {
      ok: false,
      error: `Ya llegaste al máximo de ${MAX_MONTHLY_RESERVATIONS_PER_GYM} reservas este mes en este gimnasio.`,
    };
  }

  const yaReservada = (await getActiveReservationClaseIds(userEmail)).has(claseId);
  if (yaReservada) {
    return {
      ok: false,
      error: "Ya tienes una reserva activa para esta clase.",
      code: "ya_reservada",
    };
  }

  const base = getAirtableBase();
  const created = await base("Reservas").create([
    {
      fields: {
        Usuario: userName,
        Clase: [claseId],
        Gimnasios: [gimnasioId],
        Fecha: fechaISO,
        Estado: "Reservado",
        Cedula: account.cedula,
        Correo: userEmail,
        Molestias: molestias?.trim() || "",
      },
    },
  ]);

  const remainingCredits = await deductCredits(account.recordId, claseCredits);
  invalidateClasesCupos();

  await sendNewReservationEmail({
    ownerEmail: OWNER_EMAIL,
    userName,
    userEmail,
    gimnasio: gym?.name ?? gimnasioId,
    fechaISO,
    creditos: claseCredits,
    creditosRestantes: remainingCredits,
  }).catch(() => {});

  return { ok: true, reservationId: created[0].id, remainingCredits };
}

/** Ids de clase con una reserva "Reservado" activa de esta persona (por
 * correo, no por nombre — dos personas pueden compartir nombre). Se filtra
 * en JS porque ARRAYJOIN sobre un campo de link junta el nombre del link,
 * no su id. Sirve tanto para no mostrar "Reservar"/lista de espera en una
 * clase que ya se tiene reservada, como para bloquear que se reserve o se
 * entre a la lista de espera dos veces para la misma clase. */
export async function getActiveReservationClaseIds(userEmail: string): Promise<Set<string>> {
  const base = getAirtableBase();
  const records = await base("Reservas")
    .select({
      filterByFormula: `AND(LOWER({Correo}) = LOWER("${escapeFormulaValue(userEmail)}"), {Estado} = "Reservado")`,
    })
    .all();

  const ids = new Set<string>();
  for (const record of records) {
    const claseId = (record.get("Clase") as string[] | undefined)?.[0];
    if (claseId) ids.add(claseId);
  }
  return ids;
}

const RESERVATION_HISTORY_WINDOW_HOURS = 24;

export async function getReservationsForUser(userEmail: string): Promise<Reservation[]> {
  const base = getAirtableBase();
  const records = await base("Reservas")
    .select({
      filterByFormula: `LOWER({Correo}) = LOWER("${escapeFormulaValue(userEmail)}")`,
    })
    .all();

  const now = Date.now();

  return records
    .map((record) => ({
      id: record.id,
      claseId: (record.get("Clase") as string[] | undefined)?.[0] ?? null,
      gimnasioId: (record.get("Gimnasios") as string[] | undefined)?.[0] ?? null,
      fecha: (record.get("Fecha") as string) ?? null,
      estado: (record.get("Estado") as string) ?? null,
      correo: (record.get("Correo") as string) ?? null,
      calificacion: (record.get("Calificación") as number) ?? null,
      comentario: (record.get("Comentario") as string) ?? null,
    }))
    // Una vez pasa la fecha de la clase, la reserva se sigue mostrando 24h
    // más y después desaparece de "Mis reservas" (no se borra de Airtable —
    // liquidaciones y otros reportes siguen leyendo la tabla completa).
    .filter(
      (r) => !r.fecha || now - new Date(r.fecha).getTime() < RESERVATION_HISTORY_WINDOW_HOURS * 60 * 60 * 1000
    )
    .sort((a, b) => (b.fecha ?? "").localeCompare(a.fecha ?? ""));
}

/**
 * Cancela una reserva. Si faltan 24h o más para la clase, se devuelven los
 * créditos ("Cancelado on time"). Si faltan menos de 24h, los créditos
 * quedan cobrados igual ("Cancelado").
 */
export async function cancelReservation(params: {
  reservationId: string;
  userEmail: string;
}): Promise<CancelResult> {
  const base = getAirtableBase();
  const record = await base("Reservas").find(params.reservationId);

  const fecha = record.get("Fecha") as string | undefined;
  if (!fecha) {
    return { ok: false, error: "Esta reserva no tiene fecha registrada." };
  }

  const estadoActual = record.get("Estado") as string | undefined;
  if (estadoActual && estadoActual.startsWith("Cancelado")) {
    return { ok: false, error: "Esta reserva ya está cancelada." };
  }

  const claseId = (record.get("Clase") as string[] | undefined)?.[0];
  const clase = claseId ? await getClaseById(claseId) : null;
  if (!clase) {
    return { ok: false, error: "No se encontró la clase de esta reserva." };
  }

  const account = await getUserCreditsByEmail(params.userEmail);
  if (!account) {
    return { ok: false, error: "No encontramos tu cuenta de créditos." };
  }

  const hoursUntilClass = (new Date(fecha).getTime() - Date.now()) / (1000 * 60 * 60);
  const onTime = hoursUntilClass >= CANCELLATION_WINDOW_HOURS;

  await base("Reservas").update(
    [
      {
        id: params.reservationId,
        fields: { Estado: onTime ? "Cancelado on time" : "Cancelado" },
      },
    ],
    { typecast: true }
  );

  if (onTime) {
    await addCredits(account.recordId, clase.credits);
  }
  invalidateClasesCupos();

  const gimnasioId = (record.get("Gimnasios") as string[] | undefined)?.[0];
  if (gimnasioId) {
    const gym = await getGymById(gimnasioId);
    await promoverDeListaDeEspera({
      claseId: clase.id,
      gimnasioId,
      gimnasioNombre: gym?.name ?? "",
      claseCredits: precioEfectivo(clase),
      fechaISO: fecha,
      cuposLibres: 1,
    });
  }

  return { ok: true, refunded: onTime };
}

/** Promueve hasta `cuposLibres` personas de la fila de esa clase — cada una
 * reserva de verdad (cobra créditos) y recibe correo + push. Si a alguien le
 * falla la reserva (sin créditos, perfil incompleto, etc.) se sigue con la
 * siguiente en la fila sin gastar ahí un cupo libre. La llama tanto
 * cancelReservation (siempre con cuposLibres=1, porque cancelar libera
 * exactamente uno) como promoverListasDeEsperaConCupo (el cron que revisa
 * cupos subidos a mano en Airtable, donde puede haber más de uno libre). No
 * valida cupo por su cuenta — confía en que quien llama ya lo calculó bien,
 * así que nunca hay que llamarla con más `cuposLibres` del que de verdad
 * hay disponible. */
async function promoverDeListaDeEspera(params: {
  claseId: string;
  gimnasioId: string;
  gimnasioNombre: string;
  claseCredits: number;
  fechaISO: string;
  cuposLibres: number;
}): Promise<number> {
  if (params.cuposLibres <= 0) return 0;
  const waiting = await getWaitingInOrder(params.claseId);

  let promovidos = 0;
  for (const entry of waiting) {
    if (promovidos >= params.cuposLibres) break;

    const result = await promoverEntradaListaEspera({
      entryId: entry.id,
      correo: entry.correo,
      nombre: entry.nombre,
      claseId: params.claseId,
      gimnasioId: params.gimnasioId,
      gimnasioNombre: params.gimnasioNombre,
      claseCredits: params.claseCredits,
      fechaISO: params.fechaISO,
    });

    if (result.ok) promovidos += 1;
  }
  return promovidos;
}

/** Promueve UNA entrada puntual de lista de espera a reserva confirmada —
 * cobra créditos, marca la entrada como "Promovido" y avisa a la persona
 * (push + correo). Factorizada de promoverDeListaDeEspera para que la
 * reutilice también la aprobación manual que hace el gimnasio desde su
 * panel (ver aprobarListaEspera en app/gimnasio/panel/actions.ts) — ahí
 * siempre hay exactamente una entrada de por medio, no una fila. */
export async function promoverEntradaListaEspera(params: {
  entryId: string;
  correo: string;
  nombre: string;
  claseId: string;
  gimnasioId: string;
  gimnasioNombre: string;
  claseCredits: number;
  fechaISO: string;
}): Promise<BookingResult> {
  const result = await createReservation({
    userEmail: params.correo,
    userName: params.nombre,
    claseId: params.claseId,
    gimnasioId: params.gimnasioId,
    claseCredits: params.claseCredits,
    fechaISO: params.fechaISO,
  });

  if (result.ok) {
    await markWaitlistPromoted(params.entryId);
    const persona = await getUserCreditsByEmail(params.correo);
    await sendPushNotification({
      to: persona?.pushToken ?? null,
      title: "¡Se liberó un cupo! 🎉",
      body: "Te inscribimos automáticamente en la clase de tu lista de espera.",
      data: { type: "lista-espera-promovido", claseId: params.claseId },
    });
    await sendWaitlistPromotedEmail({
      correo: params.correo,
      userName: params.nombre,
      gimnasio: params.gimnasioNombre,
      fechaISO: params.fechaISO,
    });
  }

  return result;
}

/** Revisa TODAS las clases futuras con lista de espera y promueve a quien
 * corresponda si ya tienen cupo disponible — para cuando el cupo se libera
 * por fuera de la app (ej. el dueño sube "Cupos totales" a mano en
 * Airtable, que no dispara nada por sí solo; una cancelación desde la app sí
 * promueve sola, ver cancelReservation). Pensada para correr desde un cron,
 * no desde el camino de reservar. Cuesta como mucho un puñado de llamadas a
 * Airtable por corrida sin importar cuántas clases haya (una para todas las
 * clases con sus cupos, una para todos los gimnasios, una para toda la
 * lista de espera) — el costo real de por sí solo lo paga cada persona que
 * de verdad se termina promoviendo. */
export async function promoverListasDeEsperaConCupo(): Promise<{ promovidos: number }> {
  const [clases, { gyms }, esperandoTodos] = await Promise.all([
    getAllClasesDeTodosLosGimnasios(),
    getGyms(),
    getAllWaitingEntries(),
  ]);

  const gymNameById = new Map(gyms.map((g) => [g.id, g.name]));
  const esperandoPorClase = new Map<string, number>();
  for (const entry of esperandoTodos) {
    esperandoPorClase.set(entry.claseId, (esperandoPorClase.get(entry.claseId) ?? 0) + 1);
  }

  const ahora = Date.now();
  let promovidos = 0;
  for (const clase of clases) {
    if (clase.cuposDisponibles <= 0) continue;
    if (!clase.gimnasioId) continue;
    if (!clase.fecha || new Date(clase.fecha).getTime() <= ahora) continue;
    if (!esperandoPorClase.has(clase.id)) continue;

    promovidos += await promoverDeListaDeEspera({
      claseId: clase.id,
      gimnasioId: clase.gimnasioId,
      gimnasioNombre: gymNameById.get(clase.gimnasioId) ?? "",
      claseCredits: precioEfectivo(clase),
      fechaISO: clase.fecha,
      cuposLibres: clase.cuposDisponibles,
    });
  }

  return { promovidos };
}

export type RatingResult = { ok: true } | { ok: false; error: string };

const RATING_WINDOW_HOURS = 24;

/** Califica una clase ya tomada (1–5 estrellas, comentario opcional) —
 * solo dentro de las 24h siguientes a que terminó la clase (fecha + la
 * duración de la clase). Es opcional, no bloquea nada más. */
export async function submitRating(params: {
  reservationId: string;
  userEmail: string;
  calificacion: number;
  comentario: string;
}): Promise<RatingResult> {
  if (!Number.isInteger(params.calificacion) || params.calificacion < 1 || params.calificacion > 5) {
    return { ok: false, error: "La calificación debe ser de 1 a 5 estrellas." };
  }

  const base = getAirtableBase();
  const record = await base("Reservas").find(params.reservationId);

  const correoReserva = ((record.get("Correo") as string) ?? "").trim().toLowerCase();
  if (!correoReserva || correoReserva !== params.userEmail.trim().toLowerCase()) {
    return { ok: false, error: "Esta reserva no te pertenece." };
  }

  const estado = ((record.get("Estado") as string) ?? "").trim();
  if (estado.startsWith("Cancelado")) {
    return { ok: false, error: "No puedes calificar una clase cancelada." };
  }

  const fecha = record.get("Fecha") as string | undefined;
  const claseId = (record.get("Clase") as string[] | undefined)?.[0];
  if (!fecha || !claseId) {
    return { ok: false, error: "Esta reserva no tiene información suficiente." };
  }

  const clase = await getClaseById(claseId);
  if (!clase) {
    return { ok: false, error: "No se encontró la clase de esta reserva." };
  }

  const finClase = new Date(fecha).getTime() + clase.duracionMinutos * 60_000;
  const now = Date.now();
  if (now < finClase) {
    return { ok: false, error: "Todavía no termina la clase." };
  }
  if (now > finClase + RATING_WINDOW_HOURS * 60 * 60 * 1000) {
    return { ok: false, error: "Ya pasaron las 24 horas para calificar esta clase." };
  }

  await base("Reservas").update(
    [
      {
        id: params.reservationId,
        fields: { "Calificación": params.calificacion, Comentario: params.comentario },
      },
    ],
    { typecast: true }
  );

  if (params.calificacion <= LOW_RATING_THRESHOLD) {
    try {
      const [gym, account] = await Promise.all([
        clase.gimnasioId ? getGymById(clase.gimnasioId) : Promise.resolve(null),
        getUserCreditsByEmail(params.userEmail),
      ]);
      const userName = ((record.get("Usuario") as string) ?? "Desconocido").trim();
      await sendLowRatingAlertEmail({
        ownerEmail: OWNER_EMAIL,
        gimnasio: gym?.name ?? "Gimnasio desconocido",
        clase: clase.name,
        userName,
        userEmail: params.userEmail,
        userTelefono: account?.telefono ?? null,
        calificacion: params.calificacion,
        comentario: params.comentario,
      });
    } catch {
      // no bloqueamos la calificación si falla el aviso interno
    }
  }

  return { ok: true };
}
