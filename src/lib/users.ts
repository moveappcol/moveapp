import { getAirtableBase } from "./airtable";

export type UserCredits = {
  recordId: string;
  credits: number;
  vencimiento: string | null;
  cedula: string | null;
};

/**
 * Esquema en Airtable — tabla "usuarios" (nombre en minúscula):
 *   - Correo       (texto, igual al correo de la cuenta de Clerk)
 *   - Creditos     (número)
 *   - Vencimiento  (fecha)
 *   - Cedula       (texto — se pide una sola vez, al crear la cuenta)
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
    cedula: (record.get("Cedula") as string) || null,
  };
}

/** Guarda la cédula de la persona — crea el registro en "usuarios" si
 * todavía no existe (pasa justo después de crear la cuenta, antes de
 * comprar cualquier plan). */
export async function setUserCedula(email: string, cedula: string): Promise<void> {
  const base = getAirtableBase();
  const existing = await getUserCreditsByEmail(email);

  if (existing) {
    await base(USUARIOS_TABLE).update([{ id: existing.recordId, fields: { Cedula: cedula } }]);
    return;
  }

  await base(USUARIOS_TABLE).create([{ fields: { Correo: email, Creditos: 0, Cedula: cedula } }]);
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
