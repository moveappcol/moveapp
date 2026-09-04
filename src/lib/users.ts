import { getAirtableBase, escapeFormulaValue } from "./airtable";
import type { TipoDocumento, Genero } from "./documento";

export type UserCredits = {
  recordId: string;
  credits: number;
  vencimiento: string | null;
  cedula: string | null;
  telefono: string | null;
  genero: string | null;
  perfilCompleto: boolean;
  pushToken: string | null;
};

/**
 * Esquema en Airtable — tabla "usuarios" (nombre en minúscula):
 *   - Correo                          (texto, igual al correo de la cuenta de Clerk)
 *   - Creditos                        (número)
 *   - Vencimiento                     (fecha)
 *   - Nombre                          (texto)
 *   - Apellido                        (texto)
 *   - "Teléfono"                      (texto — con tilde)
 *   - "Tipo de documento"             (selección: ver TIPOS_DOCUMENTO en lib/documento.ts)
 *   - "Número de documento"           (texto — el número del documento, sea cual sea el tipo;
 *      OJO: en la tabla "Reservas" el campo equivalente sigue llamándose "Cedula")
 *   - "Fecha de nacimiento "           (fecha — se valida que sea mayor de 18 años al guardar)
 *   - "Terminos aceptados"            (casilla)
 *   - "Tratamiento de datos aceptado" (casilla)
 *   - " Marketing aceptado"           (casilla — OJO: trae un espacio al inicio del nombre;
 *      opcional, la persona puede no aceptar)
 *   - "Perfil completo"               (casilla — true cuando ya llenó todo el formulario)
 *   - Género                          (selección: ver GENEROS en lib/documento.ts — usada para
 *      filtrar gimnasios "solo_mujeres"/"solo_hombres" en la grilla)
 *   - PushToken                       (texto — token de notificaciones push de Expo, se guarda
 *      cuando la persona inicia sesión en la app móvil; null/vacío en la web)
 */
const USUARIOS_TABLE = "usuarios";

export async function getUserCreditsByEmail(email: string): Promise<UserCredits | null> {
  const base = getAirtableBase();
  const records = await base(USUARIOS_TABLE)
    .select({
      filterByFormula: `LOWER({Correo}) = LOWER("${escapeFormulaValue(email)}")`,
      maxRecords: 1,
    })
    .all();

  const record = records[0];
  if (!record) return null;

  return {
    recordId: record.id,
    credits: (record.get("Creditos") as number) ?? 0,
    vencimiento: (record.get("Vencimiento") as string) ?? null,
    cedula: (record.get("Número de documento") as string) || null,
    telefono: (record.get("Teléfono") as string) || null,
    genero: (record.get("Género") as string) || null,
    perfilCompleto: Boolean(record.get("Perfil completo")),
    pushToken: (record.get("PushToken") as string) || null,
  };
}

/** Guarda (o borra, si `token` es null) el token de push de la persona.
 * Crea el registro en "usuarios" si todavía no existe (puede pasar antes
 * de completar el perfil). */
export async function savePushToken(email: string, token: string | null): Promise<void> {
  const base = getAirtableBase();
  const existing = await getUserCreditsByEmail(email);

  if (existing) {
    await base(USUARIOS_TABLE).update([
      { id: existing.recordId, fields: { PushToken: token ?? "" } },
    ]);
    return;
  }

  await base(USUARIOS_TABLE).create([
    { fields: { Correo: email, Creditos: 0, PushToken: token ?? "" } },
  ]);
}

export type CompleteProfileParams = {
  email: string;
  nombre: string;
  apellido: string;
  telefono: string;
  tipoDocumento: TipoDocumento;
  cedula: string;
  fechaNacimiento: string;
  genero: Genero;
  terminosAceptados: boolean;
  tratamientoDatosAceptado: boolean;
  marketingAceptado: boolean;
};

/** Guarda el perfil completo de la persona (nombre, teléfono, documento,
 * consentimientos) — crea el registro en "usuarios" si todavía no existe.
 * Pasa justo después de crear la cuenta, antes de comprar cualquier plan. */
export async function completeProfile(params: CompleteProfileParams): Promise<void> {
  const base = getAirtableBase();
  const existing = await getUserCreditsByEmail(params.email);

  const fields = {
    Correo: params.email,
    Nombre: params.nombre,
    Apellido: params.apellido,
    "Teléfono": params.telefono,
    "Tipo de documento": params.tipoDocumento,
    "Número de documento": params.cedula,
    "Fecha de nacimiento ": params.fechaNacimiento,
    "Género": params.genero,
    "Terminos aceptados": params.terminosAceptados,
    "Tratamiento de datos aceptado": params.tratamientoDatosAceptado,
    " Marketing aceptado": params.marketingAceptado,
    "Perfil completo": true,
  };

  if (existing) {
    await base(USUARIOS_TABLE).update([{ id: existing.recordId, fields }], { typecast: true });
    return;
  }

  await base(USUARIOS_TABLE).create([{ fields: { ...fields, Creditos: 0 } }], { typecast: true });
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
