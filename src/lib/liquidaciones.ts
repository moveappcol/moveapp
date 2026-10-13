import { getAirtableBase } from "./airtable";

/**
 * Esquema en Airtable — tabla "Liquidacion" (una fila por GIMNASIO por
 * QUINCENA, no por clase — antes era una fila por clase, pero con cientos
 * de clases la tabla crecía sin parar y Paula tenía que marcar "Pagado"
 * clase por clase en vez de una sola vez por quincena. Cada ocurrencia
 * (una clase, una fecha) que se va facturando (24h antes, el cron de
 * respaldo si el normal falló, o una corrección manual) se SUMA a la fila
 * del gimnasio+quincena que le corresponde según su fecha, en vez de crear
 * una fila nueva — ver agregarOcurrenciaALiquidacion/corregirOcurrencia):
 *   - Gimnasio           (texto — nombre del gimnasio)
 *   - Fecha de pago       (fecha — el corte: 13 o 27 de cada mes, ver
 *      computeFechaDePago)
 *   - Reservas confirmadas (número — suma de todas las ocurrencias incluidas)
 *   - Creditos totales      (número — suma)
 *   - Detalle                 (texto largo — un bloque por ocurrencia
 *      incluida: una línea marcador "[[nombre (hora)@fechaISO]]", una línea
 *      JSON con sus números, y el resto en texto legible — ver
 *      serializarBloque/parseBloques. El marcador evita sumar la misma
 *      ocurrencia dos veces si el cron corre de nuevo; el JSON permite
 *      recalcular el total sumando SIEMPRE desde los bloques, nunca a mano,
 *      así una corrección posterior de una sola ocurrencia — ver el webhook
 *      reserva-actualizada — nunca deja el total desincronizado)
 *   - "Estado de pago "        (selección: "Pendiente" | "Pagado" — el
 *      nombre real del campo tiene un espacio al final; se marca UNA vez
 *      por gimnasio por quincena, no por clase)
 *   - "Reservas Tipo A"           (número — suma de reservas confirmadas de
 *      ocurrencias Tipo A incluidas en esta quincena)
 *   - "Reservas Tipo B "           (número — igual para Tipo B; el nombre
 *      real del campo trae un espacio al final)
 *   - "Total Tipo A"                (número — suma de los Total Tipo A de
 *      cada ocurrencia incluida)
 *   - "Total tipo B "                 (número — suma; el nombre real del
 *      campo trae "tipo" en minúscula y espacio al final)
 *   - "Total a pagar "                 (número — Total Tipo A + Total tipo B)
 *
 * El aviso de "lista final de asistentes" (PDF que se manda ~20 min antes
 * de cada clase) ya NO vive acá — se movió al checkbox "Lista final
 * enviada" en cada fila de la tabla "Reservas" (ver marcarListaFinalEnviada
 * en reservations.ts), porque eso es por clase puntual y esta tabla pasó a
 * ser por quincena completa.
 */
const LIQUIDACION_TABLE = "Liquidacion";

/** Un gimnasio puede repetir el mismo nombre de clase varias veces el mismo
 * día (ej. "Reformer Pilates" a las 6am, 8am y 7pm) — identificar una
 * ocurrencia solo por gimnasio+nombre+día las confundiría entre sí. Se le
 * pega la hora exacta al nombre para que cada ocurrencia real tenga su
 * propia llave, sin necesitar agregar una columna nueva en Airtable. */
export function claseKeyForLiquidacion(claseName: string, claseFechaISO: string): string {
  const hora = new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(claseFechaISO));
  return `${claseName} (${hora})`;
}

const ESTADO_PAGO_FIELD = "Estado de pago ";
const TOTAL_A_PAGAR_FIELD = "Total a pagar ";
const RESERVAS_TIPO_A_FIELD = "Reservas Tipo A";
const RESERVAS_TIPO_B_FIELD = "Reservas Tipo B ";
const TOTAL_TIPO_A_FIELD = "Total Tipo A";
const TOTAL_TIPO_B_FIELD = "Total tipo B ";

const PORCENTAJE_TIPO_A = 0.4;
const PORCENTAJE_TIPO_B = 0.3;

export type LiquidacionRecord = {
  id: string;
  gimnasio: string;
  fechaDePago: string;
  detalle: string;
  reservasConfirmadas: number;
  creditosTotales: number;
  reservasTipoA: number;
  reservasTipoB: number;
  totalTipoA: number;
  totalTipoB: number;
  totalAPagar: number;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapLiquidacionRecord(r: any): LiquidacionRecord {
  return {
    id: r.id,
    gimnasio: (r.get("Gimnasio") as string) ?? "",
    fechaDePago: (r.get("Fecha de pago") as string) ?? "",
    detalle: (r.get("Detalle") as string) ?? "",
    reservasConfirmadas: (r.get("Reservas confirmadas") as number) ?? 0,
    creditosTotales: (r.get("Creditos totales") as number) ?? 0,
    reservasTipoA: (r.get(RESERVAS_TIPO_A_FIELD) as number) ?? 0,
    reservasTipoB: (r.get(RESERVAS_TIPO_B_FIELD) as number) ?? 0,
    totalTipoA: (r.get(TOTAL_TIPO_A_FIELD) as number) ?? 0,
    totalTipoB: (r.get(TOTAL_TIPO_B_FIELD) as number) ?? 0,
    totalAPagar: (r.get(TOTAL_A_PAGAR_FIELD) as number) ?? 0,
  };
}

/** Trae toda la tabla Liquidacion una sola vez — los crons que recorren
 * muchas ocurrencias en una misma corrida deben llamar esto UNA vez y
 * filtrar en memoria con findLiquidacionPeriodo (ver el mismo problema que
 * tuvo fetchAllReservasDetalle en reservations.ts: llamar find* dentro del
 * loop hacía un select().all() de esta tabla por cada clase). */
export async function fetchAllLiquidaciones(): Promise<LiquidacionRecord[]> {
  const base = getAirtableBase();
  const records = await base(LIQUIDACION_TABLE).select().all();
  return records.map(mapLiquidacionRecord);
}

export function findLiquidacionPeriodo(
  todas: LiquidacionRecord[],
  gimnasio: string,
  fechaDePago: string
): LiquidacionRecord | null {
  return (
    todas.find(
      (r) => r.gimnasio === gimnasio && r.fechaDePago === fechaDePago && esFilaDelModeloNuevo(r.detalle)
    ) ?? null
  );
}

/** Antes de este cambio (ver nota del esquema arriba), Liquidacion tenía
 * una fila por CLASE, no por quincena — esas filas viejas comparten
 * "Gimnasio" + "Fecha de pago" con la fila de quincena que le toca a esa
 * misma clase, así que sin este chequeo findLiquidacionPeriodo encontraría
 * una fila vieja por casualidad y la trataría como si fuera la fila
 * acumulada de la quincena, sumándole números encima de un total que no
 * tiene nada que ver. Una fila del modelo nuevo siempre arranca su Detalle
 * con un marcador "[[...]]" (ver serializarBloque); una fila vieja nunca lo
 * tiene. No hace falta limpiar las filas viejas para que esto funcione —
 * simplemente se ignoran para emparejar, y conviven sin pisarse hasta que
 * se archiven. */
function esFilaDelModeloNuevo(detalle: string): boolean {
  return detalle.trimStart().startsWith("[[");
}

function marcadorOcurrencia(claseKey: string, claseFechaISO: string): string {
  return `[[${claseKey}@${claseFechaISO}]]`;
}

type OcurrenciaNumeros = {
  reservasConfirmadas: number;
  creditosTotales: number;
  reservasTipoA: number;
  reservasTipoB: number;
  totalTipoA: number;
  totalTipoB: number;
  totalAPagar: number;
};

const NUMEROS_EN_CERO: OcurrenciaNumeros = {
  reservasConfirmadas: 0,
  creditosTotales: 0,
  reservasTipoA: 0,
  reservasTipoB: 0,
  totalTipoA: 0,
  totalTipoB: 0,
  totalAPagar: 0,
};

type BloqueDetalle = { marcador: string; numeros: OcurrenciaNumeros; texto: string };

/** Separa el Detalle de una fila de quincena en sus bloques por ocurrencia
 * — cada bloque empieza con una línea "[[...]]" seguida de una línea JSON
 * con sus números. Un bloque que no se pueda leer (formato viejo o
 * corrupto) se ignora para la suma pero no revienta el parseo del resto. */
function parseBloques(detalle: string): BloqueDetalle[] {
  if (!detalle.trim()) return [];
  const partes = detalle
    .split(/\n(?=\[\[)/)
    .map((p) => p.trim())
    .filter(Boolean);

  const bloques: BloqueDetalle[] = [];
  for (const parte of partes) {
    const lineas = parte.split("\n");
    const marcador = lineas[0];
    if (!marcador.startsWith("[[")) continue;
    try {
      const numeros = JSON.parse(lineas[1]) as OcurrenciaNumeros;
      bloques.push({ marcador, numeros, texto: parte });
    } catch {
      continue;
    }
  }
  return bloques;
}

function sumarNumeros(bloques: BloqueDetalle[]): OcurrenciaNumeros {
  return bloques.reduce((acc, b) => ({
    reservasConfirmadas: acc.reservasConfirmadas + b.numeros.reservasConfirmadas,
    creditosTotales: acc.creditosTotales + b.numeros.creditosTotales,
    reservasTipoA: acc.reservasTipoA + b.numeros.reservasTipoA,
    reservasTipoB: acc.reservasTipoB + b.numeros.reservasTipoB,
    totalTipoA: acc.totalTipoA + b.numeros.totalTipoA,
    totalTipoB: acc.totalTipoB + b.numeros.totalTipoB,
    totalAPagar: acc.totalAPagar + b.numeros.totalAPagar,
  }), NUMEROS_EN_CERO);
}

type ReservaComoRecord = { estado: string; userName: string };

export type OcurrenciaCounts = OcurrenciaNumeros & { detalleReservas: string };

/** Arma los conteos y el total de UNA ocurrencia (una clase, una fecha) a
 * partir de sus reservas reales — esto es lo que se SUMA a la fila de
 * quincena del gimnasio, nunca se guarda como fila propia. Solo cuentan
 * como "confirmadas" (billables) las que no se cancelaron a tiempo. El
 * Tipo A/B es del CUPO de la clase entera (ver TipoClase en classes.ts) —
 * si la clase todavía no tiene Tipo asignado, no suma nada al total hasta
 * que el staff la clasifique en Airtable (pero sí queda su bloque en el
 * Detalle, para que se note que falta clasificarla). */
export function buildOcurrenciaCounts(
  reservas: ReservaComoRecord[],
  claseCredits: number,
  claseTipo: "A" | "B" | null,
  precioPorReserva: number | null,
  porcentajes?: { tipoA: number | null; tipoB: number | null }
): OcurrenciaCounts {
  const confirmadas = reservas.filter((r) => r.estado !== "Cancelado on time");
  const reservasTipoA = claseTipo === "A" ? confirmadas.length : 0;
  const reservasTipoB = claseTipo === "B" ? confirmadas.length : 0;
  const precio = precioPorReserva ?? 0;
  const porcentajeA = porcentajes?.tipoA ?? PORCENTAJE_TIPO_A;
  const porcentajeB = porcentajes?.tipoB ?? PORCENTAJE_TIPO_B;
  const totalTipoA = Math.round(reservasTipoA * precio * porcentajeA);
  const totalTipoB = Math.round(reservasTipoB * precio * porcentajeB);
  const detalleReservas =
    reservas.map((r) => `${r.userName} - ${r.estado}`).join("\n") || "Sin reservas.";

  return {
    reservasConfirmadas: confirmadas.length,
    creditosTotales: confirmadas.length * claseCredits,
    reservasTipoA,
    reservasTipoB,
    totalTipoA,
    totalTipoB,
    totalAPagar: totalTipoA + totalTipoB,
    detalleReservas,
  };
}

function formatFechaCorta(iso: string): string {
  return new Date(iso).toLocaleString("es-CO", {
    timeZone: "America/Bogota",
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
  });
}

function serializarBloque(claseKey: string, claseFechaISO: string, counts: OcurrenciaCounts): string {
  const marcador = marcadorOcurrencia(claseKey, claseFechaISO);
  const numeros: OcurrenciaNumeros = {
    reservasConfirmadas: counts.reservasConfirmadas,
    creditosTotales: counts.creditosTotales,
    reservasTipoA: counts.reservasTipoA,
    reservasTipoB: counts.reservasTipoB,
    totalTipoA: counts.totalTipoA,
    totalTipoB: counts.totalTipoB,
    totalAPagar: counts.totalAPagar,
  };
  const fechaLarga = formatFechaCorta(claseFechaISO);
  const totalFmt = counts.totalAPagar.toLocaleString("es-CO");
  const resumen = `${claseKey} — ${fechaLarga} — ${counts.reservasConfirmadas} reserva(s) — $${totalFmt}`;
  const detalleIndentado = counts.detalleReservas
    .split("\n")
    .map((l) => `  ${l}`)
    .join("\n");
  return `${marcador}\n${JSON.stringify(numeros)}\n${resumen}\n${detalleIndentado}`;
}

async function upsertOcurrencia(params: {
  gimnasio: string;
  claseKey: string;
  claseFechaISO: string;
  fechaDePago: string;
  counts: OcurrenciaCounts;
  liquidacionesExistentes: LiquidacionRecord[];
  crearSiNoExiste: boolean;
}): Promise<{ id: string; creado: boolean; omitido: boolean }> {
  const { gimnasio, claseKey, claseFechaISO, fechaDePago, counts, liquidacionesExistentes, crearSiNoExiste } =
    params;
  const base = getAirtableBase();
  const marcador = marcadorOcurrencia(claseKey, claseFechaISO);
  const nuevoBloque = serializarBloque(claseKey, claseFechaISO, counts);

  const existente = findLiquidacionPeriodo(liquidacionesExistentes, gimnasio, fechaDePago);

  if (!existente) {
    if (!crearSiNoExiste) return { id: "", creado: false, omitido: true };

    const created = await base(LIQUIDACION_TABLE).create(
      [
        {
          fields: {
            Gimnasio: gimnasio,
            "Fecha de pago": fechaDePago,
            [ESTADO_PAGO_FIELD]: "Pendiente",
            "Reservas confirmadas": counts.reservasConfirmadas,
            "Creditos totales": counts.creditosTotales,
            [RESERVAS_TIPO_A_FIELD]: counts.reservasTipoA,
            [RESERVAS_TIPO_B_FIELD]: counts.reservasTipoB,
            [TOTAL_TIPO_A_FIELD]: counts.totalTipoA,
            [TOTAL_TIPO_B_FIELD]: counts.totalTipoB,
            [TOTAL_A_PAGAR_FIELD]: counts.totalAPagar,
            Detalle: nuevoBloque,
          },
        },
      ],
      { typecast: true }
    );
    const nueva: LiquidacionRecord = {
      id: created[0].id,
      gimnasio,
      fechaDePago,
      detalle: nuevoBloque,
      reservasConfirmadas: counts.reservasConfirmadas,
      creditosTotales: counts.creditosTotales,
      reservasTipoA: counts.reservasTipoA,
      reservasTipoB: counts.reservasTipoB,
      totalTipoA: counts.totalTipoA,
      totalTipoB: counts.totalTipoB,
      totalAPagar: counts.totalAPagar,
    };
    liquidacionesExistentes.push(nueva);
    return { id: nueva.id, creado: true, omitido: false };
  }

  const bloques = parseBloques(existente.detalle);
  const idx = bloques.findIndex((b) => b.marcador === marcador);
  const esNueva = idx === -1;
  const bloqueNuevo: BloqueDetalle = {
    marcador,
    numeros: {
      reservasConfirmadas: counts.reservasConfirmadas,
      creditosTotales: counts.creditosTotales,
      reservasTipoA: counts.reservasTipoA,
      reservasTipoB: counts.reservasTipoB,
      totalTipoA: counts.totalTipoA,
      totalTipoB: counts.totalTipoB,
      totalAPagar: counts.totalAPagar,
    },
    texto: nuevoBloque,
  };
  if (esNueva) {
    bloques.push(bloqueNuevo);
  } else {
    bloques[idx] = bloqueNuevo;
  }

  const nuevosNumeros = sumarNumeros(bloques);
  const nuevoDetalle = bloques.map((b) => b.texto).join("\n\n");

  await base(LIQUIDACION_TABLE).update(
    [
      {
        id: existente.id,
        fields: {
          "Reservas confirmadas": nuevosNumeros.reservasConfirmadas,
          "Creditos totales": nuevosNumeros.creditosTotales,
          [RESERVAS_TIPO_A_FIELD]: nuevosNumeros.reservasTipoA,
          [RESERVAS_TIPO_B_FIELD]: nuevosNumeros.reservasTipoB,
          [TOTAL_TIPO_A_FIELD]: nuevosNumeros.totalTipoA,
          [TOTAL_TIPO_B_FIELD]: nuevosNumeros.totalTipoB,
          [TOTAL_A_PAGAR_FIELD]: nuevosNumeros.totalAPagar,
          Detalle: nuevoDetalle,
        },
      },
    ],
    { typecast: true }
  );

  Object.assign(existente, { detalle: nuevoDetalle, ...nuevosNumeros });
  return { id: existente.id, creado: esNueva, omitido: false };
}

export type AgregarOcurrenciaResult = { id: string; yaIncluida: boolean };

/** Suma UNA ocurrencia (una clase, una fecha) a la fila de Liquidacion del
 * gimnasio+quincena que le corresponde — crea la fila si todavía no existe
 * para esa quincena. Si esa ocurrencia puntual ya estaba incluida, no hace
 * nada (yaIncluida: true) — así el llamador puede correr esto cuantas
 * veces quiera sobre la misma clase sin duplicar la plata. Usada por los
 * crons que FACTURAN por primera vez (24h antes, y el cron de respaldo). */
export async function agregarOcurrenciaALiquidacion(params: {
  gimnasio: string;
  claseKey: string;
  claseFechaISO: string;
  fechaDePago: string;
  counts: OcurrenciaCounts;
  liquidacionesExistentes: LiquidacionRecord[];
}): Promise<AgregarOcurrenciaResult> {
  const r = await upsertOcurrencia({ ...params, crearSiNoExiste: true });
  return { id: r.id, yaIncluida: !r.creado };
}

/** Recalcula UNA ocurrencia ya facturada dentro de su fila de quincena —
 * usada por el webhook reserva-actualizada cuando alguien corrige a mano
 * el Estado de una reserva después de que esa clase ya se facturó. A
 * diferencia de agregarOcurrenciaALiquidacion, NO crea la fila de la
 * quincena si todavía no existe (coincide con el comportamiento de antes:
 * "si la liquidación no existe, no hace nada, se calculará bien cuando se
 * cree normalmente") — solo corrige lo que ya estaba facturado. */
export async function corregirOcurrencia(params: {
  gimnasio: string;
  claseKey: string;
  claseFechaISO: string;
  fechaDePago: string;
  counts: OcurrenciaCounts;
}): Promise<{ ok: true; id: string } | { ok: false; skipped: string }> {
  const liquidacionesExistentes = await fetchAllLiquidaciones();
  const r = await upsertOcurrencia({ ...params, liquidacionesExistentes, crearSiNoExiste: false });
  if (r.omitido) {
    return { ok: false, skipped: "todavía no existe liquidación para esta quincena" };
  }
  return { ok: true, id: r.id };
}

function bogotaDateParts(iso: string): { year: number; month: number; day: number } {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = fmt.formatToParts(new Date(iso));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { year: get("year"), month: get("month"), day: get("day") };
}

/** "Y-M-D" del día de la clase en hora de Bogotá (no la del proceso del
 * servidor, que en producción puede no ser America/Bogota). */
export function toBogotaDateString(iso: string): string {
  const { year, month, day } = bogotaDateParts(iso);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Fecha de pago quincenal: clases del 1–13 se pagan el 13 del mismo mes;
 * del 14 al 27 se pagan el 27 del mismo mes; del 28 en adelante (sin
 * importar si el mes tiene 28, 29, 30 o 31 días) se pagan el 13 del mes
 * siguiente — así esos últimos días de cada mes siempre quedan incluidos
 * en el corte del 13, nunca se quedan sin un corte que los cubra. */
export function computeFechaDePago(claseISO: string): string {
  const { year, month, day } = bogotaDateParts(claseISO);
  if (day <= 13) {
    return `${year}-${String(month).padStart(2, "0")}-13`;
  }
  if (day <= 27) {
    return `${year}-${String(month).padStart(2, "0")}-27`;
  }
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  return `${nextYear}-${String(nextMonth).padStart(2, "0")}-13`;
}
