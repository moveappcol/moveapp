import { getAirtableBase } from "./airtable";
import { getUserCreditsByEmail, deductCredits, addCredits } from "./users";
import { getClaseById } from "./classes";
import { getGymById } from "./gyms";
import { sendLowRatingAlertEmail } from "./email";

const OWNER_EMAIL = "uniqueappcol@gmail.com";
const LOW_RATING_THRESHOLD = 3;

export type BookingResult =
  | { ok: true; reservationId: string; remainingCredits: number }
  | { ok: false; error: string };

export type CancelResult =
  | { ok: true; refunded: boolean }
  | { ok: false; error: string };

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

export type TipoReserva = "A" | "B" | null;

export type ReservaDetalle = {
  id: string;
  userName: string;
  estado: string;
  cedula: string;
  correo: string;
  tipo: TipoReserva;
  recordatorioEnviado: boolean;
  correoDespuesClaseEnviado: boolean;
};

/** Todas las reservas de una clase (cualquier estado), para armar el
 * reporte de liquidación. Se filtra en JS porque ARRAYJOIN sobre un campo
 * de link junta el nombre del link, no su id — filtrar por id en una
 * fórmula no funciona. */
export async function getReservationsDetailForClase(claseId: string): Promise<ReservaDetalle[]> {
  const base = getAirtableBase();
  const records = await base("Reservas").select().all();
  return records
    .filter((r) => (r.get("Clase") as string[] | undefined)?.[0] === claseId)
    .map((r) => {
      const tipo = ((r.get("Tipo") as string) ?? "").trim();
      return {
        id: r.id,
        userName: ((r.get("Usuario") as string) ?? "Desconocido").trim(),
        estado: ((r.get("Estado") as string) ?? "Reservado").trim(),
        cedula: ((r.get("Cedula") as string) ?? "").trim(),
        correo: ((r.get("Correo") as string) ?? "").trim(),
        tipo: tipo === "A" || tipo === "B" ? tipo : null,
        recordatorioEnviado: Boolean(r.get("Recordatorio enviado")),
        correoDespuesClaseEnviado: Boolean(r.get("Correo despues clase enviado")),
      };
    });
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
const BOOKING_CUTOFF_MINUTES = 20;
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
async function countMonthlyReservationsAtGym(
  userName: string,
  gimnasioId: string,
  monthKey: string
): Promise<number> {
  const base = getAirtableBase();
  const records = await base("Reservas").select().all();
  return records.filter((r) => {
    const usuario = ((r.get("Usuario") as string) ?? "").trim();
    if (usuario !== userName) return false;

    const gimnasios = r.get("Gimnasios") as string[] | undefined;
    if (!gimnasios?.includes(gimnasioId)) return false;

    const fecha = r.get("Fecha") as string | undefined;
    if (!fecha || toBogotaMonthKey(fecha) !== monthKey) return false;

    const estado = ((r.get("Estado") as string) ?? "").trim();
    return estado !== "Cancelado on time";
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
 *   - Tipo       (selección: "A" | "B" — la llena el staff a mano según
 *      cuándo el gimnasio dio esos cupos; vacío hasta que se clasifique)
 *   - "Recordatorio enviado" (casilla — evita reenviar el correo de 3h antes
 *      cuando el cron corre varias veces dentro de la ventana)
 *   - "Correo despues clase enviado" (casilla — evita reenviar el correo
 *      "AFTER CLASS" cuando el cron corre varias veces dentro de la ventana)
 *   - Calificación (número 1–5 — opcional, la pone el usuario desde "Mis
 *      reservas" hasta 24h después de terminada la clase)
 *   - Comentario    (texto largo, opcional — junto con la calificación)
 */
export async function createReservation(params: {
  userEmail: string;
  userName: string;
  claseId: string;
  gimnasioId: string;
  claseCredits: number;
  fechaISO: string;
}): Promise<BookingResult> {
  const { userEmail, userName, claseId, gimnasioId, claseCredits, fechaISO } = params;

  const minutesUntilClass = (new Date(fechaISO).getTime() - Date.now()) / (1000 * 60);
  if (minutesUntilClass < BOOKING_CUTOFF_MINUTES) {
    return {
      ok: false,
      error: `Las reservas para esta clase cierran ${BOOKING_CUTOFF_MINUTES} minutos antes de que empiece.`,
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
      },
    },
  ]);

  const remainingCredits = await deductCredits(account.recordId, claseCredits);

  return { ok: true, reservationId: created[0].id, remainingCredits };
}

export async function getReservationsForUser(userName: string): Promise<Reservation[]> {
  const base = getAirtableBase();
  const records = await base("Reservas")
    .select({ filterByFormula: `{Usuario} = "${userName}"` })
    .all();

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

  return { ok: true, refunded: onTime };
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
      const gym = clase.gimnasioId ? await getGymById(clase.gimnasioId) : null;
      const userName = ((record.get("Usuario") as string) ?? "Desconocido").trim();
      await sendLowRatingAlertEmail({
        ownerEmail: OWNER_EMAIL,
        gimnasio: gym?.name ?? "Gimnasio desconocido",
        clase: clase.name,
        userName,
        calificacion: params.calificacion,
        comentario: params.comentario,
      });
    } catch {
      // no bloqueamos la calificación si falla el aviso interno
    }
  }

  return { ok: true };
}
