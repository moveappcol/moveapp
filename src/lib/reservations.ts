import { getAirtableBase } from "./airtable";
import { getUserCreditsByEmail, deductCredits } from "./users";

export type BookingResult =
  | { ok: true; reservationId: string; remainingCredits: number }
  | { ok: false; error: string };

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
