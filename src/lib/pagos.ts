import crypto from "node:crypto";
import { getAirtableBase, escapeFormulaValue } from "./airtable";
import { withLock } from "./server-cache";
import type { PurchaseKind } from "./orders";

/**
 * Esquema en Airtable — tabla "Pagos" (auditoría + idempotencia de pagos Wompi):
 *   - Referencia    (texto, única por intento de compra)
 *   - TransaccionId (texto, id de la transacción en Wompi)
 *   - Correo        (texto)
 *   - Nombre        (texto, opcional — solo se usa en compras de regalo, que
 *      no tienen sesión de Clerk de donde sacar el nombre; si el campo
 *      todavía no existe en Airtable, se sigue guardando el pago igual, solo
 *      sin nombre, ver el try/catch de createPendingPago)
 *   - Tipo          (selección: "Plan" | "Adicional" | "Regalo")
 *   - item          (texto, minúscula — id del catálogo, ej. "plan-starter")
 *   - Creditos      (número)
 *   - Estado        (selección: "Pendiente" | "Aprobado" | "Rechazado")
 *   - PaymentSourceId (número, opcional — solo para "Plan": la fuente de
 *      pago de Wompi que se cobró, para poder activar/renovar la
 *      suscripción desde el webhook si Wompi confirma la aprobación tarde)
 *   - "Factura PDF"  (texto, opcional — link al PDF de la factura
 *      electrónica generada en Dataico; vacío si todavía no se ha generado
 *      o si falló, ver la alerta por correo en ese caso)
 *   - "Factura CUFE" (texto, opcional — código único de la factura ante la
 *      DIAN, para referencia/soporte)
 *   - "Factura Numero" (número entero, opcional — el consecutivo dentro del
 *      rango autorizado por la resolución DIAN de UNIQUE, ej. 1-5000;
 *      Dataico lo exige explícito, no lo asigna solo. Se reserva ANTES de
 *      llamar a Dataico, así que puede quedar puesto en un pago cuya
 *      factura terminó fallando — eso deja un hueco en la numeración, que
 *      es normal y está permitido en facturación electrónica.)
 *   - "NotaCredito" (número entero, opcional — el consecutivo dentro de la
 *      numeración de notas crédito, prefijo "NCE" (a diferencia de las
 *      facturas, esta numeración no usa resolución DIAN, ver
 *      CREDIT_NOTE_PREFIX en dataico.ts). Se pone cuando un pago con
 *      factura ya generada se anula después y hay que anular esa factura
 *      ante la DIAN — también sirve como marca de "esta reversión ya
 *      emitió su nota crédito", para no duplicarla.)
 *   - "Valor" (número, el valor real en COP que se cobró — YA con
 *      cualquier descuento/cupón aplicado. Se guarda al crear el pago
 *      (createPendingPago) para poder facturar el monto exacto sin tener
 *      que recalcularlo — el webhook de Wompi, a diferencia del cobro
 *      síncrono, no tiene a mano el descuento que se haya aplicado.)
 *   - "Fbp" / "Fbc" (texto, opcional — las cookies "_fbp"/"_fbc" del pixel
 *      de Meta en el navegador de quien compró, leídas al crear el pago.
 *      Se guardan acá porque el webhook de Wompi que confirma el pago
 *      llega server-to-server, sin esas cookies a mano — así el aviso de
 *      "Purchase" que se manda por Conversions API desde el webhook igual
 *      puede llevarlas, que es lo que más sube la calidad del match según
 *      el Administrador de eventos de Meta.)
 */
const PAGOS_TABLE = "Pagos";

export type PagoEstado = "Pendiente" | "Aprobado" | "Rechazado";

export type Pago = {
  id: string;
  referencia: string;
  correo: string;
  /** Solo se guarda en compras de regalo — null en cualquier otra. */
  nombre: string | null;
  /** Código de referido escrito al pagar (ver referidos.ts) — null si no
   * escribió ninguno, o en pagos de antes de este campo. */
  codigoReferido: string | null;
  tipo: PurchaseKind;
  item: string;
  creditos: number;
  estado: PagoEstado;
  paymentSourceId: number | null;
  /** Link al PDF de la factura electrónica ya generada, si la hay — trae el
   * UUID de la factura en Dataico (query param "document-id"), necesario
   * para poder anularla con una nota crédito si el pago se revierte
   * después. Null si nunca se facturó (o falló). */
  facturaPdfUrl: string | null;
  /** Número de la nota crédito ya emitida para este pago, si la hay — sirve
   * de marca de idempotencia: si ya tiene una, no hay que emitir otra. */
  notaCredito: number | null;
  /** Valor real en COP cobrado (con descuento ya aplicado, si hubo). Null en
   * pagos creados antes de agregar este campo. */
  valor: number | null;
  /** Cookies "_fbp"/"_fbc" del pixel de Meta en el navegador de quien
   * compró, leídas al crear el pago — null si no había (ej. compra desde
   * la app móvil, que no tiene pixel) o el pago es de antes de este campo. */
  fbp: string | null;
  fbc: string | null;
  /** Token aleatorio que escribe cada intento de claimPagoAprobado — sirve
   * para desempatar cuando el cobro síncrono y el webhook de Wompi
   * confirman el mismo pago casi al mismo tiempo (ver esa función). Null
   * en pagos de antes de este campo, o mientras la columna "ClaimToken"
   * todavía no exista en Airtable. */
  claimToken: string | null;
};

function mapRecordToPago(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  record: any
): Pago {
  const paymentSourceId = record.get("PaymentSourceId") as number | undefined;
  return {
    id: record.id,
    referencia: (record.get("Referencia") as string) ?? "",
    correo: (record.get("Correo") as string) ?? "",
    nombre: (record.get("Nombre") as string) || null,
    codigoReferido: (record.get("CodigoReferido") as string) || null,
    tipo:
      (record.get("Tipo") as string) === "Plan"
        ? "plan"
        : (record.get("Tipo") as string) === "Regalo"
          ? "regalo"
          : (record.get("Tipo") as string) === "Suelto"
            ? "suelto"
            : (record.get("Tipo") as string) === "Prueba"
              ? "prueba"
              : "topup",
    item: (record.get("item") as string) ?? "",
    creditos: (record.get("Creditos") as number) ?? 0,
    estado: ((record.get("Estado") as string) ?? "Pendiente") as PagoEstado,
    paymentSourceId: paymentSourceId !== undefined && paymentSourceId !== null ? paymentSourceId : null,
    facturaPdfUrl: (record.get("Factura PDF") as string) || null,
    notaCredito: (record.get("NotaCredito") as number) || null,
    valor: (record.get("Valor") as number) || null,
    fbp: (record.get("Fbp") as string) || null,
    fbc: (record.get("Fbc") as string) || null,
    claimToken: (record.get("ClaimToken") as string) || null,
  };
}

export async function createPendingPago(params: {
  referencia: string;
  correo: string;
  tipo: PurchaseKind;
  item: string;
  creditos: number;
  /** Valor real en COP que se va a cobrar (con descuento ya aplicado, si
   * hubo) — se guarda para poder facturar el monto exacto después, sin
   * tener que recalcularlo desde el catálogo (que no sabe de descuentos). */
  valor: number;
  paymentSourceId?: number;
  /** Cookies "_fbp"/"_fbc" del pixel de Meta, si había (ver
   * getMetaRequestContext) — se guardan para poder mandarlas con el aviso
   * de "Purchase" por Conversions API cuando el webhook de Wompi confirme
   * el pago más tarde. */
  fbp?: string | null;
  fbc?: string | null;
  /** Nombre de quien compra — solo lo mandan las compras de regalo (no hay
   * sesión de Clerk de donde sacarlo). */
  nombre?: string | null;
  /** Código de referido escrito al pagar (ver referidos.ts) — solo en
   * compras de plan. */
  codigoReferido?: string | null;
}): Promise<string> {
  const base = getAirtableBase();
  const baseFields = {
    Referencia: params.referencia,
    Correo: params.correo,
    Tipo:
      params.tipo === "plan"
        ? "Plan"
        : params.tipo === "regalo"
          ? "Regalo"
          : params.tipo === "suelto"
            ? "Suelto"
            : params.tipo === "prueba"
              ? "Prueba"
              : "Adicional",
    item: params.item,
    Creditos: params.creditos,
    Valor: params.valor,
    Estado: "Pendiente",
    ...(params.paymentSourceId !== undefined ? { PaymentSourceId: params.paymentSourceId } : {}),
  };
  const optionalFields = {
    ...(params.fbp ? { Fbp: params.fbp } : {}),
    ...(params.fbc ? { Fbc: params.fbc } : {}),
    ...(params.nombre ? { Nombre: params.nombre } : {}),
    ...(params.codigoReferido ? { CodigoReferido: params.codigoReferido } : {}),
  };

  try {
    const created = await base(PAGOS_TABLE).create(
      [{ fields: { ...baseFields, ...optionalFields } }],
      { typecast: true }
    );
    return created[0].id;
  } catch (err) {
    // Si "Fbp"/"Fbc"/"Nombre"/"CodigoReferido" todavía no existen como columnas en Airtable,
    // Airtable rechaza el create completo por "Unknown field name" — un
    // pago real no se puede perder por esto, así que se reintenta sin esos
    // campos opcionales (el resto del flujo sigue igual, solo sin ese dato
    // extra).
    if (Object.keys(optionalFields).length === 0) throw err;
    const created = await base(PAGOS_TABLE).create([{ fields: baseFields }], { typecast: true });
    return created[0].id;
  }
}

export async function findPagoByReferencia(referencia: string): Promise<Pago | null> {
  const base = getAirtableBase();
  const records = await base(PAGOS_TABLE)
    .select({
      filterByFormula: `{Referencia} = "${escapeFormulaValue(referencia)}"`,
      maxRecords: 1,
    })
    .all();
  const record = records[0];
  return record ? mapRecordToPago(record) : null;
}

/** El cobro síncrono (justo al pagar) y el webhook de Wompi pueden confirmar
 * la MISMA transacción casi al mismo tiempo — cada uno leería el pago
 * todavía en "Pendiente" y los dos acreditarían créditos y activarían la
 * suscripción por separado. withLock serializa esto SOLO dentro de un mismo
 * proceso de Node — si el cobro síncrono y el webhook caen en procesos
 * distintos (ej. durante un deploy, con la instancia vieja y la nueva
 * solapadas unos segundos), cada uno tiene su propio candado en memoria y
 * los dos pueden leer "Pendiente" y acreditar por separado. Esto fue
 * exactamente lo que le pasó a Jess Rubio comprando la Prueba UNIQUE
 * (2026-10-28): un solo cobro real, créditos acreditados dos veces.
 *
 * Por eso, además del candado (que sigue sirviendo para no hacer trabajo
 * duplicado dentro de un mismo proceso), se usa Airtable mismo como árbitro
 * entre procesos: cada intento escribe su propio ClaimToken aleatorio (no
 * se puede usar transaccionId para desempatar — las dos llamadas traen el
 * MISMO id de Wompi) y luego relee el registro. Si lo que quedó guardado es
 * el token que esta llamada acaba de escribir, esta llamada ganó la
 * carrera; si quedó el token de la otra llamada (que escribió después),
 * esta perdió y no debe acreditar nada. */
export async function claimPagoAprobado(referencia: string, transaccionId: string): Promise<boolean> {
  return withLock(`pago:${referencia}`, async () => {
    const fresh = await findPagoByReferencia(referencia);
    if (!fresh || fresh.estado === "Aprobado") return false;

    const base = getAirtableBase();
    const claimToken = crypto.randomUUID();
    try {
      await base(PAGOS_TABLE).update(
        [{ id: fresh.id, fields: { Estado: "Aprobado", TransaccionId: transaccionId, ClaimToken: claimToken } }],
        { typecast: true }
      );
    } catch {
      // La columna "ClaimToken" todavía no existe en Airtable — se sigue
      // aprobando igual que antes (sin el desempate entre procesos)
      // mientras se crea esa columna, en vez de romper la confirmación de
      // pagos reales.
      await updatePagoEstado(fresh.id, "Aprobado", transaccionId);
      return true;
    }
    const after = await findPagoByReferencia(referencia);
    return after?.claimToken === claimToken;
  });
}

/** Un pago que ya estaba "Aprobado" (créditos ya dados) llega anulado desde
 * Wompi (ej. reembolso manual desde su dashboard) — como con
 * claimPagoAprobado, se usa el mismo lock para que dos webhooks del mismo
 * evento no reviertan los créditos dos veces. Devuelve el pago (con sus
 * datos de antes de marcarlo "Rechazado") para que el llamador sepa cuántos
 * créditos quitar; null si no había nada que revertir. */
export async function claimPagoRevertido(referencia: string, transaccionId: string): Promise<Pago | null> {
  return withLock(`pago:${referencia}`, async () => {
    const fresh = await findPagoByReferencia(referencia);
    if (!fresh || fresh.estado !== "Aprobado") return null;
    await updatePagoEstado(fresh.id, "Rechazado", transaccionId);
    return fresh;
  });
}

export async function updatePagoEstado(
  recordId: string,
  estado: PagoEstado,
  transaccionId: string
): Promise<void> {
  const base = getAirtableBase();
  await base(PAGOS_TABLE).update(
    [{ id: recordId, fields: { Estado: estado, TransaccionId: transaccionId } }],
    { typecast: true }
  );
}

/** Guarda la referencia de la factura electrónica ya generada en Dataico,
 * para tener el link al PDF y el CUFE a la mano desde el mismo registro
 * del pago — sin esto, un pago exitoso no deja ningún rastro de si la
 * factura se generó bien o no (solo se avisaba por correo cuando fallaba). */
export async function updatePagoFactura(
  recordId: string,
  factura: { pdfUrl: string; cufe: string }
): Promise<void> {
  const base = getAirtableBase();
  await base(PAGOS_TABLE).update(
    [{ id: recordId, fields: { "Factura PDF": factura.pdfUrl, "Factura CUFE": factura.cufe } }],
    { typecast: true }
  );
}

/** Reserva el siguiente número de factura dentro del rango de la resolución
 * DIAN, bajo un lock global para que dos compras al mismo tiempo nunca
 * terminen usando el mismo número. Se guarda en el propio Pago antes de
 * llamar a Dataico — si la factura falla después, el número queda "gastado"
 * (hueco en la numeración), lo cual es válido, en vez de arriesgarse a
 * reutilizarlo. */
export async function reserveNextFacturaNumero(recordId: string): Promise<number> {
  return withLock("dataico:numeracion", async () => {
    const base = getAirtableBase();
    // OJO: "{Campo} != ''" NO filtra los vacíos en un campo numérico —
    // Airtable trata un número vacío como 0 al evaluar la fórmula, y
    // "0 != ''" da verdadero, así que esa fórmula trae la tabla completa.
    // ">  0" sí excluye los vacíos de verdad.
    const usados = await base(PAGOS_TABLE)
      .select({ filterByFormula: `{Factura Numero} > 0`, fields: ["Factura Numero"] })
      .all();
    const max = usados.reduce((m, r) => Math.max(m, Number(r.get("Factura Numero")) || 0), 0);
    const numero = max + 1;
    await base(PAGOS_TABLE).update([{ id: recordId, fields: { "Factura Numero": numero } }], {
      typecast: true,
    });
    return numero;
  });
}

/** Igual que reserveNextFacturaNumero, pero para la resolución DIAN de
 * notas crédito (rango y prefijo aparte de la de facturas) — lock y campo
 * separados para que las dos numeraciones nunca se mezclen. */
export async function reserveNextNotaCreditoNumero(recordId: string): Promise<number> {
  return withLock("dataico:numeracion-nc", async () => {
    const base = getAirtableBase();
    const usados = await base(PAGOS_TABLE)
      .select({ filterByFormula: `{NotaCredito} > 0`, fields: ["NotaCredito"] })
      .all();
    const max = usados.reduce((m, r) => Math.max(m, Number(r.get("NotaCredito")) || 0), 0);
    const numero = max + 1;
    await base(PAGOS_TABLE).update([{ id: recordId, fields: { NotaCredito: numero } }], {
      typecast: true,
    });
    return numero;
  });
}
