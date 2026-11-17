import crypto from "node:crypto";
import { getAirtableBase, escapeFormulaValue } from "./airtable";
import { withLock } from "./server-cache";
import { addCreditsByEmail } from "./users";
import { findCatalogItem, parseRegaloItemId } from "./orders";
import { CIUDAD_REGALO_FISICO } from "./credits-pricing";
import { validateCoupon, redeemFreeCouponForEmail } from "./cupones";
import { getSubscriptionByEmail, upsertSubscription } from "./subscriptions";

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
 *   - FechaLimite         (fecha — 6 meses después de la compra; pasada esa
 *      fecha el código ya no se puede canjear, y la plata queda perdida, no
 *      se reembolsa automático)
 *   - Estado               (selección: "Sin activar" | "Activado" | "Vencido")
 *   - ActivadoPorCorreo     (texto, opcional — el correo de quien canjeó)
 *   - FechaActivacion        (fecha, opcional)
 * Tarjetas de regalo (Navidad 2026 en adelante):
 *   - Meses              (número — 1, 2 o 3; vacío = 1, como los de antes)
 *   - MesesEntregados    (número — cuántos meses de créditos ya recibió
 *      quien lo canjeó; el cron regalos-mensuales entrega el resto)
 *   - ProximaEntrega     (fecha — cuándo le toca el siguiente mes)
 *   - Tipo               (selección: "Virtual" | "Física")
 *   - Para / DeParte     (texto — lo que va escrito en la tarjeta)
 *   - Ciudad / Direccion / Celular (texto — solo las físicas, para el envío)
 *   - EstadoEnvio        (selección: "Por enviar" | "Enviada" — solo físicas)
 * Mientras el pago no se aprueba, la fila existe con Estado "Pendiente de
 * pago" y sin Codigo (ver prepararRegalo) — así los datos de la tarjeta
 * quedan guardados aunque el pago lo confirme el webhook más tarde.
 */
const REGALOS_TABLE = "Regalos";
const MESES_VALIDEZ = 6;

export type Regalo = {
  id: string;
  codigo: string;
  planId: string;
  compradoPorCorreo: string;
  compradoPorNombre: string;
  pagoId: string;
  fechaCompra: string;
  fechaLimite: string;
  estado: "Pendiente de pago" | "Sin activar" | "Activado" | "Vencido";
  activadoPorCorreo: string | null;
  meses: number;
  mesesEntregados: number;
  proximaEntrega: string | null;
  tipo: "Virtual" | "Física";
  para: string;
  deParte: string;
  ciudad: string;
  direccion: string;
  celular: string;
};

/** Lo que se escribe en el formulario de la tarjeta de regalo. */
export type DatosTarjetaRegalo = {
  para: string;
  deParte: string;
  /** Solo si es física. */
  envio?: { ciudad: string; direccion: string; celular: string } | null;
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
    meses: (r.get("Meses") as number) || 1,
    mesesEntregados: (r.get("MesesEntregados") as number) || 0,
    proximaEntrega: (r.get("ProximaEntrega") as string) || null,
    tipo: (r.get("Tipo") as string) === "Física" ? "Física" : "Virtual",
    para: (r.get("Para") as string) ?? "",
    deParte: (r.get("DeParte") as string) ?? "",
    ciudad: (r.get("Ciudad") as string) ?? "",
    direccion: (r.get("Direccion") as string) ?? "",
    celular: (r.get("Celular") as string) ?? "",
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

/** Al empezar el pago de una tarjeta de regalo: guarda de una vez lo que
 * va en la tarjeta (para quién, de parte de quién, envío) atado al Pago,
 * sin código todavía. crearRegalo la completa cuando el pago se aprueba. */
export async function prepararRegalo(params: {
  itemId: string;
  compradoPorCorreo: string;
  compradoPorNombre: string;
  pagoId: string;
  datos: DatosTarjetaRegalo;
}): Promise<void> {
  const opciones = parseRegaloItemId(params.itemId);
  if (!opciones) throw new Error(`Regalo desconocido: ${params.itemId}`);
  const base = getAirtableBase();
  await base(REGALOS_TABLE).create(
    [
      {
        fields: {
          Plan: opciones.planId,
          Meses: opciones.meses,
          Tipo: opciones.fisica ? "Física" : "Virtual",
          CompradoPorCorreo: params.compradoPorCorreo,
          CompradoPorNombre: params.compradoPorNombre,
          PagoId: params.pagoId,
          Estado: "Pendiente de pago",
          Para: params.datos.para,
          DeParte: params.datos.deParte,
          ...(opciones.fisica && params.datos.envio
            ? {
                Ciudad: params.datos.envio.ciudad,
                Direccion: params.datos.envio.direccion,
                Celular: params.datos.envio.celular,
                EstadoEnvio: "Por enviar",
              }
            : {}),
        },
      },
    ],
    { typecast: true }
  );
}

/** Revisa lo que llega del formulario (web o app) antes de cobrar — nunca
 * confiar en el cliente. Las físicas solo se envían dentro de Bogotá. */
export function validarDatosTarjetaRegalo(
  input: { para?: unknown; deParte?: unknown; ciudad?: unknown; direccion?: unknown; celular?: unknown },
  fisica: boolean
): { ok: true; datos: DatosTarjetaRegalo } | { ok: false; error: string } {
  const texto = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const para = texto(input.para);
  const deParte = texto(input.deParte);
  if (!para || !deParte) return { ok: false, error: "Escribe para quién es y de parte de quién." };
  if (!fisica) return { ok: true, datos: { para, deParte, envio: null } };

  const ciudad = texto(input.ciudad);
  const direccion = texto(input.direccion);
  const celular = texto(input.celular).replace(/\s/g, "");
  const normalizar = (c: string) => c.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (normalizar(ciudad) !== normalizar(CIUDAD_REGALO_FISICO)) {
    return { ok: false, error: "Por ahora la tarjeta física solo se puede enviar dentro de Bogotá." };
  }
  if (!direccion) return { ok: false, error: "Escribe la dirección de entrega." };
  if (!/^\+?\d{7,13}$/.test(celular)) return { ok: false, error: "Escribe un celular válido para coordinar la entrega." };
  return { ok: true, datos: { para, deParte, envio: { ciudad: CIUDAD_REGALO_FISICO, direccion, celular } } };
}

async function findRegaloByPagoId(pagoId: string): Promise<Regalo | null> {
  const base = getAirtableBase();
  const records = await base(REGALOS_TABLE)
    .select({ filterByFormula: `{PagoId} = "${escapeFormulaValue(pagoId)}"`, maxRecords: 1 })
    .all();
  return records[0] ? mapRecordToRegalo(records[0]) : null;
}

/** Se llama cuando un pago tipo "regalo" queda aprobado (webhook de Wompi o
 * cobro tokenizado de la app) — genera el código. Si prepararRegalo ya dejó
 * la fila con los datos de la tarjeta, la completa; si no (compras viejas),
 * la crea. Reintenta si por casualidad el código ya existe (no debería
 * pasar casi nunca con 8 caracteres de un alfabeto de 33, pero un choque
 * silencioso dejaría dos regalos con el mismo código canjeable). */
export async function crearRegalo(params: {
  itemId: string;
  compradoPorCorreo: string;
  compradoPorNombre: string;
  pagoId: string;
}): Promise<Regalo> {
  const opciones = parseRegaloItemId(params.itemId);
  if (!opciones) throw new Error(`Regalo desconocido: ${params.itemId}`);
  const base = getAirtableBase();
  const fechaCompra = new Date().toISOString().slice(0, 10);
  const fechaLimite = addMonthsISO(fechaCompra, MESES_VALIDEZ);
  const preparado = await findRegaloByPagoId(params.pagoId);

  for (let intento = 0; intento < 5; intento++) {
    const codigo = generarCodigo();
    const existente = await findRegaloByCodigo(codigo);
    if (existente) continue;

    const fields = {
      Codigo: codigo,
      Plan: opciones.planId,
      Meses: opciones.meses,
      CompradoPorCorreo: params.compradoPorCorreo,
      CompradoPorNombre: params.compradoPorNombre,
      PagoId: params.pagoId,
      FechaCompra: fechaCompra,
      FechaLimite: fechaLimite,
      Estado: "Sin activar",
    };
    const guardado = preparado
      ? await base(REGALOS_TABLE).update([{ id: preparado.id, fields }], { typecast: true })
      : await base(REGALOS_TABLE).create([{ fields: { ...fields, Tipo: opciones.fisica ? "Física" : "Virtual" } }], {
          typecast: true,
        });
    return mapRecordToRegalo(guardado[0]);
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
    if (!regalo) {
      // No es un código de regalo (tabla "Regalos") — puede ser un cupón de
      // créditos gratis (tabla "Cupones", ej. UNIQUE24) canjeado desde esta
      // misma entrada ("¿Te regalaron un plan? Canjéalo aquí").
      const cupon = await validateCoupon(codigo);
      if (cupon.ok && cupon.cupon.tipo === "Créditos gratis") {
        return redeemFreeCouponForEmail(correoDestino, codigo);
      }
      return { ok: false, error: "No encontramos ese código." };
    }

    if (regalo.estado === "Activado") {
      return { ok: false, error: "Este código ya fue canjeado." };
    }

    const hoy = new Date().toISOString().slice(0, 10);
    if (regalo.estado === "Vencido" || regalo.fechaLimite < hoy) {
      if (regalo.estado !== "Vencido") await marcarVencido(regalo.id);
      return { ok: false, error: "Este código ya venció y no se puede canjear." };
    }

    if (regalo.estado === "Pendiente de pago") {
      return { ok: false, error: "No encontramos ese código." };
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
            // Regalos de 2 o 3 meses: hoy se entrega el primero y el cron
            // regalos-mensuales entrega los demás, uno cada mes.
            ...(regalo.meses > 1 ? { MesesEntregados: 1, ProximaEntrega: addMonthsISO(hoy, 1) } : {}),
          },
        },
      ],
      { typecast: true }
    );

    // extendVencimiento: true, sin fechaBase — vencimiento a 1 mes desde
    // hoy, igual que cualquier plan que empieza a correr ahora.
    await addCreditsByEmail(correoDestino, plan.credits, true);

    // Esta persona sí pagó un mes real de un plan (a diferencia de un
    // cupón de créditos gratis, que regala UNIQUE sin cobro) — por eso
    // queda visible en Suscripciones para seguimiento, con Estado
    // "Cancelada" (nunca "Activa": nadie dejó tarjeta guardada al comprar
    // el regalo, así que jamás se le puede cobrar el mes siguiente, y
    // tampoco fue lo que compró quien lo regaló). Si la persona YA tiene
    // una Suscripcion real "Activa" (compró su propio plan aparte y
    // además canjeó este regalo), no se toca esa fila — redimir un regalo
    // nunca debe pisar/cancelar un plan real que sigue cobrando solo.
    const existingSub = await getSubscriptionByEmail(correoDestino);
    if (!existingSub || existingSub.estado !== "Activa") {
      await upsertSubscription({
        correo: correoDestino,
        plan: regalo.planId,
        paymentSourceId: 0,
        estado: "Cancelada",
      });
    }

    return { ok: true, credits: plan.credits };
  });
}

async function marcarVencido(id: string): Promise<void> {
  const base = getAirtableBase();
  await base(REGALOS_TABLE).update([{ id, fields: { Estado: "Vencido" } }], { typecast: true });
}

/** Cron diario (regalos-mensuales): a quien canjeó un regalo de 2 o 3
 * meses le entrega los créditos del mes que le toca — mismos créditos del
 * plan, con vencimiento a 1 mes desde hoy, igual que una renovación. Se
 * filtra en JS (igual que getDueActiveSubscriptions) por los formatos de
 * fecha de Airtable. */
export async function entregarMesesDeRegalos(): Promise<{ entregados: number; fallidos: string[] }> {
  const base = getAirtableBase();
  const hoy = new Date().toISOString().slice(0, 10);
  const records = await base(REGALOS_TABLE).select({ filterByFormula: `{Estado} = "Activado"` }).all();
  const pendientes = records
    .map(mapRecordToRegalo)
    .filter(
      (r) => r.meses > r.mesesEntregados && r.mesesEntregados > 0 && r.proximaEntrega && r.proximaEntrega <= hoy
    );

  let entregados = 0;
  const fallidos: string[] = [];
  for (const regalo of pendientes) {
    try {
      await withLock(`regalo-mes:${regalo.id}`, async () => {
        const plan = findCatalogItem("regalo", regalo.planId);
        if (!plan || !regalo.activadoPorCorreo) throw new Error("Regalo sin plan o sin correo de activación");
        const mesesEntregados = regalo.mesesEntregados + 1;
        // Primero se avanza el contador y después se acreditan: si algo
        // falla a la mitad, preferimos que falte un mes (se ve en la alerta
        // y se da a mano) a acreditarlo dos veces en el siguiente run.
        await base(REGALOS_TABLE).update(
          [
            {
              id: regalo.id,
              fields: {
                MesesEntregados: mesesEntregados,
                ...(mesesEntregados < regalo.meses ? { ProximaEntrega: addMonthsISO(hoy, 1) } : {}),
              },
            },
          ],
          { typecast: true }
        );
        await addCreditsByEmail(regalo.activadoPorCorreo, plan.credits, true);
      });
      entregados += 1;
    } catch (err) {
      fallidos.push(`${regalo.codigo}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  return { entregados, fallidos };
}
