import { getAirtableBase } from "./airtable";

export type UserCredits = {
  recordId: string;
  credits: number;
  vencimiento: string | null;
};

/**
 * Esquema en Airtable — tabla "usuarios" (nombre en minúscula):
 *   - Correo       (texto, igual al correo de la cuenta de Clerk)
 *   - Creditos     (número)
 *   - Vencimiento  (fecha)
 */
const USUARIOS_TABLE = "usuarios";

export async function getUserCreditsByEmail(email: string): Promise<UserCredits | null> {
  const base = getAirtableBase();
  const records = await base(USUARIOS_TABLE)
    .select({
      filterByFormula: `LOWER({Correo}) = LOWER("${email}")`,
      maxRecords: 1,
    })
    .all();

  const record = records[0];
  if (!record) return null;

  return {
    recordId: record.id,
    credits: (record.get("Creditos") as number) ?? 0,
    vencimiento: (record.get("Vencimiento") as string) ?? null,
  };
}

export async function deductCredits(recordId: string, amount: number): Promise<number> {
  const base = getAirtableBase();
  const record = await base(USUARIOS_TABLE).find(recordId);
  const current = (record.get("Creditos") as number) ?? 0;
  const next = Math.max(0, current - amount);
  await base(USUARIOS_TABLE).update([{ id: recordId, fields: { Creditos: next } }]);
  return next;
}

export async function addCredits(recordId: string, amount: number): Promise<number> {
  const base = getAirtableBase();
  const record = await base(USUARIOS_TABLE).find(recordId);
  const current = (record.get("Creditos") as number) ?? 0;
  const next = current + amount;
  await base(USUARIOS_TABLE).update([{ id: recordId, fields: { Creditos: next } }]);
  return next;
}

function oneMonthFromToday(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
}

/** Acredita una compra confirmada por Wompi. Crea el registro en "usuarios"
 * si la persona compra por primera vez. Comprar un plan extiende el
 * vencimiento 1 mes; comprar un adicional solo suma créditos. */
export async function addCreditsByEmail(
  email: string,
  amount: number,
  extendVencimiento: boolean
): Promise<void> {
  const base = getAirtableBase();
  const existing = await getUserCreditsByEmail(email);

  const vencimiento = extendVencimiento ? oneMonthFromToday() : undefined;

  if (existing) {
    await base(USUARIOS_TABLE).update([
      {
        id: existing.recordId,
        fields: { Creditos: existing.credits + amount, ...(vencimiento && { Vencimiento: vencimiento }) },
      },
    ]);
    return;
  }

  await base(USUARIOS_TABLE).create([
    { fields: { Correo: email, Creditos: amount, ...(vencimiento && { Vencimiento: vencimiento }) } },
  ]);
}
