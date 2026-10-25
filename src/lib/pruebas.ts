import { getAirtableBase, escapeFormulaValue } from "./airtable";
import { withLock } from "./server-cache";
import { deductCreditsByEmail } from "./users";
import { TRIAL_DURATION_DAYS } from "./credits-pricing";

/**
 * Esquema en Airtable — tabla "Pruebas" (una fila por Prueba UNIQUE de 1
 * semana comprada):
 *   - Correo                (texto)
 *   - Telefono               (texto — copiado del perfil al momento de comprar,
 *      para bloquear una segunda prueba con otro correo pero el mismo celular)
 *   - TarjetaHash            (texto, opcional — hash de bin+last_four+exp de
 *      la tarjeta usada, si el cliente lo manda; señal secundaria, nunca la
 *      única razón para bloquear)
 *   - CodigoReferido         (texto, opcional — el código de referido escrito
 *      al comprar la prueba, si lo hubo; se usa apenas en la conversión al
 *      Starter, que es el primer pago de "plan" real que hace esta cuenta —
 *      comprar la prueba en sí no otorga nada de referidos, ver
 *      procesarReferido en referidos.ts)
 *   - PagoId                 (texto — id del registro en "Pagos")
 *   - WompiPaymentSourceId   (texto — la fuente de pago guardada en Wompi,
 *      para poder cobrar el Starter después sin pedir tarjeta otra vez)
 *   - FechaInicio            (fecha y hora — momento exacto del pago aprobado)
 *   - FechaFin               (fecha y hora — FechaInicio + 7 días exactos)
 *   - CreditosOtorgados      (número — 16, fijo, pero guardado por si cambia
 *      el precio/créditos de la prueba en el futuro)
 *   - Estado                 (selección: "Activa" | "Cancelada" | "Convertida"
 *      | "Cobro fallido" | "Reembolsada")
 *   - AceptacionTexto        (texto largo — el texto exacto de la casilla
 *      legal que aceptó, evidencia Ley 1480)
 *   - AceptacionFecha        (fecha y hora)
 *   - AceptacionIp           (texto)
 *   - AceptacionUserAgent    (texto)
 *   - RecordatorioEnviado    (casilla)
 *   - RecordatorioFecha      (fecha y hora)
 *   - IntentoReintento       (casilla — true una vez ya se reintentó el cobro
 *      fallido a las 24h; una segunda falla con esto en true es definitiva)
 *   - ProximoReintento       (fecha y hora — cuándo reintentar el cobro que
 *      falló la primera vez; vacío mientras no haya fallado nunca)
 *   - UltimoErrorCobro       (texto — motivo del último cobro fallido, para
 *      el panel de administración)
 *   - CreditosVencidos       (casilla — true cuando ya se le restaron los
 *      créditos sobrantes de una prueba cancelada que llegó a su FechaFin;
 *      evita que el cron de vencidos la procese dos veces)
 */
const PRUEBAS_TABLE = "Pruebas";

/** Texto exacto de la casilla legal del checkout (Ley 1480) — se exporta
 * para que la UI y lo que se guarda como evidencia en AceptacionTexto
 * nunca puedan desincronizarse. */
export const TEXTO_ACEPTACION_PRUEBA =
  "Entiendo que al terminar mi semana de prueba se me cobrará automáticamente el plan Starter ($209.900/mes), salvo que cancele antes.";

export type PruebaEstado = "Activa" | "Cancelada" | "Convertida" | "Cobro fallido" | "Reembolsada";

export type Prueba = {
  id: string;
  correo: string;
  telefono: string | null;
  tarjetaHash: string | null;
  codigoReferido: string | null;
  pagoId: string;
  paymentSourceId: number;
  fechaInicio: string;
  fechaFin: string;
  creditosOtorgados: number;
  estado: PruebaEstado;
  intentoReintento: boolean;
  proximoReintento: string | null;
  creditosVencidos: boolean;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRecordToPrueba(record: any): Prueba {
  return {
    id: record.id,
    correo: (record.get("Correo") as string) ?? "",
    telefono: (record.get("Telefono") as string) || null,
    tarjetaHash: (record.get("TarjetaHash") as string) || null,
    codigoReferido: (record.get("CodigoReferido") as string) || null,
    pagoId: (record.get("PagoId") as string) ?? "",
    paymentSourceId: Number(record.get("WompiPaymentSourceId")) || 0,
    fechaInicio: (record.get("FechaInicio") as string) ?? "",
    fechaFin: (record.get("FechaFin") as string) ?? "",
    creditosOtorgados: (record.get("CreditosOtorgados") as number) ?? 0,
    estado: ((record.get("Estado") as string) || "Activa") as PruebaEstado,
    intentoReintento: Boolean(record.get("IntentoReintento")),
    proximoReintento: (record.get("ProximoReintento") as string) || null,
    creditosVencidos: Boolean(record.get("CreditosVencidos")),
  };
}

function addDaysISO(dateISO: string, days: number): string {
  const d = new Date(dateISO);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export async function getPruebaByEmail(correo: string): Promise<Prueba | null> {
  const base = getAirtableBase();
  const records = await base(PRUEBAS_TABLE)
    .select({
      filterByFormula: `LOWER({Correo}) = LOWER("${escapeFormulaValue(correo)}")`,
      maxRecords: 1,
      sort: [{ field: "FechaInicio", direction: "desc" }],
    })
    .all();
  const record = records[0];
  return record ? mapRecordToPrueba(record) : null;
}

/** Por id de registro — usado por el webhook de Wompi para reconocer un
 * cobro de conversión (convertirPruebaAStarter construye la referencia con
 * `prueba.id` como ownerRef, ver buildReference en orders.ts) cuando ese
 * cobro queda "Pendiente" y se resuelve después por este camino en vez de
 * por la respuesta síncrona. */
export async function getPruebaById(id: string): Promise<Prueba | null> {
  const base = getAirtableBase();
  try {
    const record = await base(PRUEBAS_TABLE).find(id);
    return mapRecordToPrueba(record);
  } catch {
    return null;
  }
}

/** Usado por el webhook de Wompi para saber si ya se creó el registro de
 * esta prueba (puede ganarle la carrera a chargeTrial si el cobro quedó
 * "Pendiente" del lado síncrono) — evita crear la fila dos veces. */
export async function getPruebaByPagoId(pagoId: string): Promise<Prueba | null> {
  const base = getAirtableBase();
  const records = await base(PRUEBAS_TABLE)
    .select({ filterByFormula: `{PagoId} = "${escapeFormulaValue(pagoId)}"`, maxRecords: 1 })
    .all();
  const record = records[0];
  return record ? mapRecordToPrueba(record) : null;
}

export async function getPruebaActivaByEmail(correo: string): Promise<Prueba | null> {
  const prueba = await getPruebaByEmail(correo);
  return prueba && prueba.estado === "Activa" ? prueba : null;
}

export type ElegibilidadPrueba = { ok: true } | { ok: false; error: string };

const MENSAJE_NO_ELEGIBLE = "La prueba es solo para nuevos usuarios. Mira nuestros planes.";

/** Una sola prueba por persona — bloquea si el correo o el teléfono ya
 * tuvieron una prueba antes (aunque sea otra cuenta), o si esa cuenta ya
 * tuvo cualquier pago aprobado antes (plan, suelto, regalo u otra prueba).
 * `tarjetaHash` es una señal secundaria opcional (ver TarjetaHash arriba) —
 * nunca es, por sí sola, la única razón para bloquear si no viene. */
export async function esElegibleParaPrueba(
  correo: string,
  telefono: string | null,
  tarjetaHash?: string | null
): Promise<ElegibilidadPrueba> {
  const base = getAirtableBase();

  const pagosPrevios = await base("Pagos")
    .select({
      filterByFormula: `AND(LOWER({Correo}) = LOWER("${escapeFormulaValue(correo)}"), {Estado} = "Aprobado")`,
      maxRecords: 1,
    })
    .all();
  if (pagosPrevios.length > 0) return { ok: false, error: MENSAJE_NO_ELEGIBLE };

  const clausulas = [`LOWER({Correo}) = LOWER("${escapeFormulaValue(correo)}")`];
  if (telefono) clausulas.push(`{Telefono} = "${escapeFormulaValue(telefono)}"`);
  if (tarjetaHash) clausulas.push(`{TarjetaHash} = "${escapeFormulaValue(tarjetaHash)}"`);

  const pruebasPrevias = await base(PRUEBAS_TABLE)
    .select({ filterByFormula: `OR(${clausulas.join(",")})`, maxRecords: 1 })
    .all();
  if (pruebasPrevias.length > 0) return { ok: false, error: MENSAJE_NO_ELEGIBLE };

  return { ok: true };
}

export async function crearPrueba(params: {
  correo: string;
  telefono: string | null;
  tarjetaHash: string | null;
  codigoReferido: string | null;
  pagoId: string;
  paymentSourceId: number;
  creditos: number;
  aceptacionTexto: string;
  aceptacionIp: string | null;
  aceptacionUserAgent: string | null;
}): Promise<Prueba> {
  const base = getAirtableBase();
  const fechaInicio = new Date().toISOString();
  const fechaFin = addDaysISO(fechaInicio, TRIAL_DURATION_DAYS);

  const created = await base(PRUEBAS_TABLE).create(
    [
      {
        fields: {
          Correo: params.correo,
          Telefono: params.telefono ?? "",
          TarjetaHash: params.tarjetaHash ?? "",
          CodigoReferido: params.codigoReferido ?? "",
          PagoId: params.pagoId,
          WompiPaymentSourceId: String(params.paymentSourceId),
          FechaInicio: fechaInicio,
          FechaFin: fechaFin,
          CreditosOtorgados: params.creditos,
          Estado: "Activa",
          AceptacionTexto: params.aceptacionTexto,
          AceptacionFecha: fechaInicio,
          AceptacionIp: params.aceptacionIp ?? "",
          AceptacionUserAgent: params.aceptacionUserAgent ?? "",
          RecordatorioEnviado: false,
          IntentoReintento: false,
          CreditosVencidos: false,
        },
      },
    ],
    { typecast: true }
  );
  return mapRecordToPrueba(created[0]);
}

/** Cancela la renovación — conserva créditos y acceso hasta FechaFin (ver
 * expirarCreditosDePruebasVencidas), solo cambia si está "Activa" y todavía
 * no llegó a FechaFin. */
export async function cancelarPrueba(correo: string): Promise<boolean> {
  return withLock(`prueba:${correo.toLowerCase()}`, async () => {
    const prueba = await getPruebaByEmail(correo);
    const hoy = new Date().toISOString();
    if (!prueba || prueba.estado !== "Activa" || prueba.fechaFin <= hoy) return false;

    const base = getAirtableBase();
    await base(PRUEBAS_TABLE).update([{ id: prueba.id, fields: { Estado: "Cancelada" } }], {
      typecast: true,
    });
    return true;
  });
}

/** Reactiva una prueba cancelada mientras siga vigente (antes de FechaFin) —
 * vuelve a quedar sujeta a la conversión automática al Starter. */
export async function reactivarPrueba(correo: string): Promise<boolean> {
  return withLock(`prueba:${correo.toLowerCase()}`, async () => {
    const prueba = await getPruebaByEmail(correo);
    const hoy = new Date().toISOString();
    if (!prueba || prueba.estado !== "Cancelada" || prueba.fechaFin <= hoy) return false;

    const base = getAirtableBase();
    await base(PRUEBAS_TABLE).update([{ id: prueba.id, fields: { Estado: "Activa" } }], {
      typecast: true,
    });
    return true;
  });
}

/** Pruebas "Activa" cuya FechaFin ya llegó y que no están esperando su
 * reintento de 24h — el cron de conversión las cobra. Cubre tanto el primer
 * intento (ProximoReintento vacío) como el reintento (ProximoReintento ya
 * pasó) con una sola consulta. */
export async function getDuePruebas(): Promise<Prueba[]> {
  const base = getAirtableBase();
  const records = await base(PRUEBAS_TABLE).select({ filterByFormula: `{Estado} = "Activa"` }).all();
  const ahora = new Date().toISOString();
  return records
    .map(mapRecordToPrueba)
    .filter((p) => p.fechaFin <= ahora && (!p.proximoReintento || p.proximoReintento <= ahora));
}

/** Pruebas activas a las que hay que mandarles el recordatorio de 48h antes
 * de que termine — una sola vez por prueba (RecordatorioEnviado). */
export async function getPruebasParaRecordatorio(): Promise<Prueba[]> {
  const base = getAirtableBase();
  const records = await base(PRUEBAS_TABLE)
    .select({ filterByFormula: `AND({Estado} = "Activa", NOT({RecordatorioEnviado}))` })
    .all();
  const en48h = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
  return records.map(mapRecordToPrueba).filter((p) => p.fechaFin <= en48h);
}

export async function marcarRecordatorioEnviado(id: string): Promise<void> {
  const base = getAirtableBase();
  await base(PRUEBAS_TABLE).update(
    [{ id, fields: { RecordatorioEnviado: true, RecordatorioFecha: new Date().toISOString() } }],
    { typecast: true }
  );
}

export async function marcarConvertida(id: string): Promise<void> {
  const base = getAirtableBase();
  await base(PRUEBAS_TABLE).update([{ id, fields: { Estado: "Convertida" } }], { typecast: true });
}

/** Cobro fallido definitivo (ya se había reintentado a las 24h antes) — la
 * cuenta se queda sin plan activo. Resta de una vez los créditos sobrantes
 * de la prueba (ya no hay FechaFin que esperar: esta prueba ya terminó sin
 * convertir), igual que hace expirarCreditosDePruebasVencidas con una
 * cancelada. */
export async function marcarCobroFallidoDefinitivo(prueba: Prueba, motivo: string): Promise<void> {
  const base = getAirtableBase();
  await base(PRUEBAS_TABLE).update(
    [{ id: prueba.id, fields: { Estado: "Cobro fallido", UltimoErrorCobro: motivo, CreditosVencidos: true } }],
    { typecast: true }
  );
  await deductCreditsByEmail(prueba.correo, prueba.creditosOtorgados);
}

/** Primer cobro fallido — programa el reintento a las 24h, sin tocar
 * Estado (sigue "Activa": getDuePruebas() no la vuelve a tomar hasta que
 * llegue ProximoReintento). */
export async function marcarReintentoProgramado(id: string, motivo: string): Promise<void> {
  const base = getAirtableBase();
  const proximoReintento = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  await base(PRUEBAS_TABLE).update(
    [{ id, fields: { IntentoReintento: true, ProximoReintento: proximoReintento, UltimoErrorCobro: motivo } }],
    { typecast: true }
  );
}

export async function marcarReembolsada(id: string): Promise<void> {
  const base = getAirtableBase();
  await base(PRUEBAS_TABLE).update([{ id, fields: { Estado: "Reembolsada" } }], { typecast: true });
}

/** Corre a diario: a las pruebas "Cancelada" que ya llegaron a su FechaFin
 * (conservaron créditos y acceso hasta ahí, como se prometió) se les resta
 * lo que les quede del saldo compartido — mismo patrón que
 * expirarCreditosReferidoVencidos en referidos.ts. CreditosVencidos evita
 * procesar la misma prueba dos veces si el cron se reintenta. */
export async function expirarCreditosDePruebasVencidas(): Promise<{ procesados: number; fallos: string[] }> {
  const base = getAirtableBase();
  const ahora = new Date().toISOString();
  const records = await base(PRUEBAS_TABLE)
    .select({ filterByFormula: `AND({Estado} = "Cancelada", NOT({CreditosVencidos}))` })
    .all();
  const vencidas = records.map(mapRecordToPrueba).filter((p) => p.fechaFin <= ahora);

  let procesados = 0;
  const fallos: string[] = [];
  for (const prueba of vencidas) {
    try {
      await deductCreditsByEmail(prueba.correo, prueba.creditosOtorgados);
      await base(PRUEBAS_TABLE).update([{ id: prueba.id, fields: { CreditosVencidos: true } }], {
        typecast: true,
      });
      procesados += 1;
    } catch (err) {
      fallos.push(`${prueba.correo}: ${err instanceof Error ? err.message : "error desconocido"}`);
    }
  }
  return { procesados, fallos };
}

export async function getAllPruebas(): Promise<Prueba[]> {
  const base = getAirtableBase();
  const records = await base(PRUEBAS_TABLE).select({ sort: [{ field: "FechaInicio", direction: "desc" }] }).all();
  return records.map(mapRecordToPrueba);
}
