import crypto from "node:crypto";
import { getAirtableBase, escapeFormulaValue } from "./airtable";
import { withLock } from "./server-cache";
import { addCreditsByEmail } from "./users";
import { findCatalogItem } from "./orders";

/**
 * Esquema en Airtable — tabla "Regalos" (un plan comprado como regalo,
 * canjeable una vez por quien reciba el código):
 *   - Codigo             (texto, único — el código que se canjea)
 *   - Plan               (texto — id del catálogo, ej. "plan-starter")
 *   - CompradoPorCorreo  (texto)
 *   - CompradoPorNombre  (texto)
 *   - PagoId             (texto — id del registro en "Pagos", para trazar
 *      la compra real)
 *   - FechaCompra        (fecha)
 *   - FechaLimite         (fecha — 3 meses después de la compra; pasada esa
 *      fecha el código ya no se puede canjear, y la plata queda perdida, no
 *      se reembolsa automático)
 *   - Estado               (selección: "Sin activar" | "Activado" | "Vencido")
 *   - ActivadoPorCorreo     (texto, opcional — el correo de quien canjeó)
 *   - FechaActivacion        (fecha, opcional)
 */
const REGALOS_TABLE = "Regalos";
const MESES_VALIDEZ = 3;

export type Regalo = {
  id: string;
  codigo: string;
  planId: string;
  compradoPorCorreo: string;
  compradoPorNombre: string;
  pagoId: string;
  fechaCompra: string;
  fechaLimite: string;
  estado: "Sin activar" | "Activado" | "Vencido";
  activadoPorCorreo: string | null;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRecordToRegalo(r: any): Regalo {
  return {
    id: r.id,
    codigo: (r.get("Codigo") as string) ?? "",
    planId: (r.get("Plan") as string) ?? "",
    compradoPorCorreo: (r.get("CompradoPorCorreo") as string) ?? "",
    compradoPorNombre: (r.get("CompradoPorNombre") as string) ?? "",
    pagoId: (r.get("PagoId") as string) ?? "",
    fechaCompra: (r.get("FechaCompra") as string) ?? "",
    fechaLimite: (r.get("FechaLimite") as string) ?? "",
    estado: ((r.get("Estado") as string) || "Sin activar") as Regalo["estado"],
    activadoPorCorreo: (r.get("ActivadoPorCorreo") as string) || null,
  };
}

/** Códigos cortos, sin caracteres ambiguos (sin 0/O, 1/I) — se van a leer en
 * voz alta o copiar de un papel impreso, así que priman fáciles de
 * transcribir sobre densidad. */
const ALFABETO_CODIGO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generarCodigo(): string {
  const bytes = crypto.randomBytes(8);
  let codigo = "";
  for (let i = 0; i < 8; i++) {
    codigo += ALFABETO_CODIGO[bytes[i] % ALFABETO_CODIGO.length];
  }
  return `${codigo.slice(0, 4)}-${codigo.slice(4)}`;
}

function addMonthsISO(dateISO: string, months: number): string {
  const d = new Date(dateISO);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

/** Se llama desde el webhook de Wompi cuando un pago tipo "regalo" queda
 * aprobado — genera el código y crea el registro. Reintenta si por
 * casualidad el código ya existe (no debería pasar casi nunca con 8
 * caracteres de un alfabeto de 33, pero un choque silencioso dejaría dos
 * regalos con el mismo código canjeable). */
export async function crearRegalo(params: {
  planId: string;
  compradoPorCorreo: string;
  compradoPorNombre: string;
  pagoId: string;
}): Promise<Regalo> {
  const base = getAirtableBase();
  const fechaCompra = new Date().toISOString().slice(0, 10);
  const fechaLimite = addMonthsISO(fechaCompra, MESES_VALIDEZ);

  for (let intento = 0; intento < 5; intento++) {
    const codigo = generarCodigo();
    const existente = await findRegaloByCodigo(codigo);
    if (existente) continue;

    const created = await base(REGALOS_TABLE).create(
      [
        {
          fields: {
            Codigo: codigo,
            Plan: params.planId,
            CompradoPorCorreo: params.compradoPorCorreo,
            CompradoPorNombre: params.compradoPorNombre,
            PagoId: params.pagoId,
            FechaCompra: fechaCompra,
            FechaLimite: fechaLimite,
            Estado: "Sin activar",
          },
        },
      ],
      { typecast: true }
    );
    return mapRecordToRegalo(created[0]);
  }

  throw new Error("No se pudo generar un código de regalo único después de varios intentos.");
}

export async function findRegaloByCodigo(codigo: string): Promise<Regalo | null> {
  const base = getAirtableBase();
  const records = await base(REGALOS_TABLE)
    .select({
      filterByFormula: `UPPER({Codigo}) = "${escapeFormulaValue(codigo.toUpperCase())}"`,
      maxRecords: 1,
    })
    .all();
  const record = records[0];
  return record ? mapRecordToRegalo(record) : null;
}

export type CanjearRegaloResult =
  | { ok: true; credits: number }
  | { ok: false; error: string };

/** Canjea un código: le da los créditos del plan a `correoDestino` (no al
 * comprador) y marca el regalo como usado. `withLock` evita que un doble
 * clic (o dos pestañas) canjee el mismo código dos veces — la primera
 * carrera gana, la segunda encuentra el estado ya cambiado. */
export async function canjearRegalo(codigo: string, correoDestino: string): Promise<CanjearRegaloResult> {
  return withLock(`regalo:${codigo.toUpperCase()}`, async () => {
    const regalo = await findRegaloByCodigo(codigo);
    if (!regalo) return { ok: false, error: "No encontramos ese código de regalo." };

    if (regalo.estado === "Activado") {
      return { ok: false, error: "Este código ya fue canjeado." };
    }

    const hoy = new Date().toISOString().slice(0, 10);
    if (regalo.estado === "Vencido" || regalo.fechaLimite < hoy) {
      if (regalo.estado !== "Vencido") await marcarVencido(regalo.id);
      return { ok: false, error: "Este código ya venció y no se puede canjear." };
    }

    const plan = findCatalogItem("regalo", regalo.planId);
    if (!plan) return { ok: false, error: "El plan de este regalo ya no existe." };

    const base = getAirtableBase();
    await base(REGALOS_TABLE).update(
      [
        {
          id: regalo.id,
          fields: {
            Estado: "Activado",
            ActivadoPorCorreo: correoDestino,
            FechaActivacion: hoy,
          },
        },
      ],
      { typecast: true }
    );

    // extendVencimiento: true, sin fechaBase — vencimiento a 1 mes desde
    // hoy, igual que cualquier plan que empieza a correr ahora. NO toca la
    // tabla "Suscripciones": un regalo es un crédito único, no una
    // suscripción recurrente (así se decidió a propósito).
    await addCreditsByEmail(correoDestino, plan.credits, true);

    return { ok: true, credits: plan.credits };
  });
}

async function marcarVencido(id: string): Promise<void> {
  const base = getAirtableBase();
  await base(REGALOS_TABLE).update([{ id, fields: { Estado: "Vencido" } }], { typecast: true });
}
