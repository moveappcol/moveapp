import { getAirtableBase } from "./airtable";

/**
 * Esquema en Airtable — tabla "Suscripciones" (una fila por persona con
 * suscripción activa o inactiva; se reutiliza la misma fila si vuelve a
 * suscribirse):
 *   - Correo               (texto)
 *   - Plan                 (texto — id del catálogo, ej. "plan-25")
 *   - WompiPaymentSourceId (texto — id de la tarjeta guardada en Wompi)
 *   - Estado               (selección: "Activa" | "Cancelada" | "Pago fallido")
 *   - ProximoCobro         (fecha)
 *   - PlanSiguiente        (texto — plan al que cambia en la próxima renovación, si aplica)
 */
const SUSCRIPCIONES_TABLE = "Suscripciones";

export type SubscriptionEstado = "Activa" | "Cancelada" | "Pago fallido";

export type Subscription = {
  id: string;
  correo: string;
  plan: string;
  paymentSourceId: number;
  estado: SubscriptionEstado;
  proximoCobro: string | null;
  planSiguiente: string | null;
};

function mapRecordToSubscription(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  record: any
): Subscription {
  return {
    id: record.id,
    correo: (record.get("Correo") as string) ?? "",
    plan: (record.get("Plan") as string) ?? "",
    paymentSourceId: Number(record.get("WompiPaymentSourceId")) || 0,
    estado: ((record.get("Estado") as string) ?? "Activa") as SubscriptionEstado,
    proximoCobro: (record.get("ProximoCobro") as string) ?? null,
    planSiguiente: (record.get("PlanSiguiente") as string) || null,
  };
}

export async function getSubscriptionByEmail(email: string): Promise<Subscription | null> {
  const base = getAirtableBase();
  const records = await base(SUSCRIPCIONES_TABLE)
    .select({ filterByFormula: `LOWER({Correo}) = LOWER("${email}")`, maxRecords: 1 })
    .all();
  const record = records[0];
  return record ? mapRecordToSubscription(record) : null;
}

function oneMonthFrom(dateISO: string): string {
  const d = new Date(dateISO);
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
}

/** Crea o reactiva la suscripción de una persona (primer cobro exitoso). */
export async function upsertSubscription(params: {
  correo: string;
  plan: string;
  paymentSourceId: number;
}): Promise<void> {
  const base = getAirtableBase();
  const existing = await getSubscriptionByEmail(params.correo);
  const proximoCobro = oneMonthFrom(new Date().toISOString());
  const fields = {
    Correo: params.correo,
    Plan: params.plan,
    WompiPaymentSourceId: String(params.paymentSourceId),
    Estado: "Activa",
    ProximoCobro: proximoCobro,
    PlanSiguiente: "",
  };
  if (existing) {
    await base(SUSCRIPCIONES_TABLE).update([{ id: existing.id, fields }], { typecast: true });
  } else {
    await base(SUSCRIPCIONES_TABLE).create([{ fields }], { typecast: true });
  }
}

export async function cancelSubscription(email: string): Promise<void> {
  const base = getAirtableBase();
  const existing = await getSubscriptionByEmail(email);
  if (!existing) return;
  await base(SUSCRIPCIONES_TABLE).update(
    [{ id: existing.id, fields: { Estado: "Cancelada" } }],
    { typecast: true }
  );
}

/** El cambio de plan aplica en la próxima renovación (sin prorrateo). */
export async function scheduleChangePlan(email: string, newPlanId: string): Promise<void> {
  const base = getAirtableBase();
  const existing = await getSubscriptionByEmail(email);
  if (!existing || existing.estado !== "Activa") return;
  await base(SUSCRIPCIONES_TABLE).update(
    [{ id: existing.id, fields: { PlanSiguiente: newPlanId } }],
    { typecast: true }
  );
}

/** Suscripciones activas cuyo ProximoCobro ya llegó. Se filtra la fecha en
 * JS (no con una fórmula de Airtable) — más confiable con los formatos de
 * fecha reales de la base. */
export async function getDueActiveSubscriptions(): Promise<Subscription[]> {
  const base = getAirtableBase();
  const records = await base(SUSCRIPCIONES_TABLE)
    .select({ filterByFormula: `{Estado} = "Activa"` })
    .all();
  const today = new Date().toISOString().slice(0, 10);
  return records
    .map(mapRecordToSubscription)
    .filter((sub) => sub.proximoCobro && sub.proximoCobro <= today);
}

/** Renovación exitosa: aplica el cambio de plan pendiente (si había),
 * avanza ProximoCobro un mes desde la fecha que tocaba (no desde hoy, para
 * que el día de cobro no vaya derivando por retrasos del cron). */
export async function markSubscriptionRenewed(sub: Subscription): Promise<void> {
  const base = getAirtableBase();
  const plan = sub.planSiguiente || sub.plan;
  await base(SUSCRIPCIONES_TABLE).update(
    [
      {
        id: sub.id,
        fields: {
          Plan: plan,
          PlanSiguiente: "",
          ProximoCobro: oneMonthFrom(sub.proximoCobro ?? new Date().toISOString()),
        },
      },
    ],
    { typecast: true }
  );
}

/** Cobro rechazado: no reintenta automáticamente (v1). La persona debe
 * volver a suscribirse desde /mi-suscripcion. */
export async function markSubscriptionFailed(subId: string): Promise<void> {
  const base = getAirtableBase();
  await base(SUSCRIPCIONES_TABLE).update(
    [{ id: subId, fields: { Estado: "Pago fallido" } }],
    { typecast: true }
  );
}
