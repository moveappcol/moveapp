import { getAirtableBase } from "./airtable";

export type HallazgoSalud = { tipo: string; detalle: string; esPago: boolean };

const PAGO_PENDIENTE_HORAS = 3;

/** Pagos que quedaron "Pendiente" hace más de PAGO_PENDIENTE_HORAS horas —
 * normalmente el webhook de Wompi los resuelve en minutos, así que uno
 * viejo casi siempre significa que algo se atoró del lado de Wompi o del
 * webhook. Es dato financiero: el agente diario NUNCA debe "arreglar" esto
 * solo, solo avisar. */
export async function findStuckPendingPagos(): Promise<HallazgoSalud[]> {
  const base = getAirtableBase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const records = (await base("Pagos")
    .select({ filterByFormula: `{Estado} = "Pendiente"` })
    .all()) as any[];

  const limite = Date.now() - PAGO_PENDIENTE_HORAS * 60 * 60 * 1000;
  return records
    .filter((r) => new Date(r._rawJson.createdTime).getTime() < limite)
    .map((r) => ({
      tipo: "pago_pendiente_atascado",
      detalle: `Pago ${r.get("Referencia")} (${r.get("Correo")}) sigue "Pendiente" desde ${r._rawJson.createdTime}.`,
      esPago: true,
    }));
}

/** Suscripciones marcadas "Pago fallido" (ver markSubscriptionFailed en
 * subscriptions.ts) — la persona debe volver a suscribirse manualmente en
 * v1, pero si se acumulan muchas puede ser señal de un problema real con
 * el cobro recurrente. Dato financiero: solo avisar, nunca arreglar solo. */
export async function findFailedSubscriptions(): Promise<HallazgoSalud[]> {
  const base = getAirtableBase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const records = (await base("Suscripciones")
    .select({ filterByFormula: `{Estado} = "Pago fallido"` })
    .all()) as any[];

  return records.map((r) => ({
    tipo: "suscripcion_pago_fallido",
    detalle: `Suscripción de ${r.get("Correo")} quedó en "Pago fallido" (plan ${r.get("Plan")}).`,
    esPago: true,
  }));
}
