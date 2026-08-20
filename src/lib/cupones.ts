import { getAirtableBase } from "./airtable";

export type TipoCupon = "Créditos gratis" | "Descuento";

export type Cupon = {
  recordId: string;
  codigo: string;
  tipo: TipoCupon;
  creditos: number | null;
  descuentoPorcentaje: number | null;
  usosMaximos: number | null;
  usosActuales: number;
  fechaExpiracion: string | null;
};

/**
 * Esquema en Airtable — tabla "Cupones":
 *   - Codigo             (texto, sin tilde — se compara sin importar mayúsculas/espacios)
 *   - Tipo                (selección MÚLTIPLE — solo se usa el primer valor: "Créditos gratis" | "Descuento")
 *   - Créditos             (número — para tipo "Créditos gratis")
 *   - Descuento              (número — porcentaje, ej. 20 = 20%, para tipo "Descuento")
 *   - Activo                  (selección MÚLTIPLE — no es casilla; se considera activo si
 *      el primer valor es la cadena "true")
 *   - "Usos máximos "           (número, opcional — vacío = ilimitado)
 *   - "Usos actuales "           (número — se incrementa cada vez que se redime)
 *   - "Fecha de expiración "      (fecha, opcional)
 */
const CUPONES_TABLE = "Cupones";

function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

function mapRecordToCupon(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  record: any
): Cupon | null {
  const codigo = ((record.get("Codigo") as string) ?? "").trim();
  const tipo = (record.get("Tipo") as string[] | undefined)?.[0] ?? "";
  if (!codigo || (tipo !== "Créditos gratis" && tipo !== "Descuento")) return null;

  return {
    recordId: record.id,
    codigo,
    tipo,
    creditos: (record.get("Créditos") as number) ?? null,
    descuentoPorcentaje: (record.get("Descuento") as number) ?? null,
    usosMaximos: (record.get("Usos máximos ") as number) ?? null,
    usosActuales: (record.get("Usos actuales ") as number) ?? 0,
    fechaExpiracion: (record.get("Fecha de expiración ") as string) ?? null,
  };
}

export type CuponValidationResult =
  | { ok: true; cupon: Cupon }
  | { ok: false; error: string };

/** Valida que el cupón exista, esté activo, no haya expirado y no haya
 * agotado sus usos. No lo marca como usado — eso pasa solo al redimirlo. */
export async function validateCoupon(code: string): Promise<CuponValidationResult> {
  const base = getAirtableBase();
  const records = await base(CUPONES_TABLE).select().all();
  const target = normalizeCode(code);
  const record = records.find((r) => normalizeCode((r.get("Codigo") as string) ?? "") === target);

  if (!record) return { ok: false, error: "Ese cupón no existe." };

  const activo = (record.get("Activo") as string[] | undefined)?.[0] === "true";
  if (!activo) return { ok: false, error: "Ese cupón ya no está activo." };

  const cupon = mapRecordToCupon(record);
  if (!cupon) return { ok: false, error: "Ese cupón no está configurado correctamente." };

  if (cupon.fechaExpiracion && new Date(cupon.fechaExpiracion).getTime() < Date.now()) {
    return { ok: false, error: "Ese cupón ya expiró." };
  }

  if (cupon.usosMaximos !== null && cupon.usosActuales >= cupon.usosMaximos) {
    return { ok: false, error: "Ese cupón ya alcanzó el máximo de usos." };
  }

  if (cupon.tipo === "Créditos gratis" && (!cupon.creditos || cupon.creditos <= 0)) {
    return { ok: false, error: "Ese cupón no tiene créditos configurados." };
  }

  if (cupon.tipo === "Descuento" && (!cupon.descuentoPorcentaje || cupon.descuentoPorcentaje <= 0)) {
    return { ok: false, error: "Ese cupón no tiene un descuento configurado." };
  }

  return { ok: true, cupon };
}

/** Marca el cupón como usado una vez más — se llama solo después de que la
 * acción que depende de él (redimir créditos o cobrar con descuento) tuvo
 * éxito. */
export async function markCouponRedeemed(recordId: string, usosActuales: number): Promise<void> {
  const base = getAirtableBase();
  await base(CUPONES_TABLE).update([{ id: recordId, fields: { "Usos actuales ": usosActuales + 1 } }]);
}
