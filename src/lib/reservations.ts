import { getAirtableBase } from "./airtable";
import { getUserCreditsByEmail, deductCredits, addCredits } from "./users";
import { getClaseById } from "./classes";

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
};

const CANCELLATION_WINDOW_HOURS = 24;

/**
 * Esquema en Airtable — tabla "Reservas":
 *   - Usuario    (texto — nombre de quien reserva)
 *   - Clase      (link a Clases)
 *   - Gimnasios  (link a Gimnasios)
 *   - Fecha      (fecha y hora)
 *   - Estado     (selección: "Reservado", "Cancelado on time", "Asistió", "No asistió", ...)
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

  const base = getAirtableBase();
  const created = await base("Reservas").create([
    {
      fields: {
        Usuario: userName,
        Clase: [claseId],
        Gimnasios: [gimnasioId],
        Fecha: fechaISO,
        Estado: "Reservado",
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
