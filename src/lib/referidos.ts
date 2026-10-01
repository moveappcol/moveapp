import { getAirtableBase, escapeFormulaValue } from "./airtable";
import { getUserCreditsByEmail, addCreditsByEmail, deductCreditsByEmail } from "./users";
import { getSubscriptionByEmail } from "./subscriptions";

/**
 * Esquema en Airtable:
 *   - Tabla "usuarios", campo nuevo "CodigoReferido" (texto, único — el
 *     código que cada persona comparte para referir).
 *   - Tabla "Pagos", campo nuevo "CodigoReferido" (texto, opcional — el
 *     código que se escribió al pagar, si lo hubo).
 *   - Tabla nueva "Referidos" (una fila por crédito de referido otorgado):
 *       - ReferidoCorreo    (texto — quien pagó y disparó el crédito)
 *       - ReferenteCorreo   (texto — quien tiene el código y recibe el crédito)
 *       - CodigoUsado       (texto)
 *       - PagoId            (texto — id del Pago que lo disparó)
 *       - FechaOtorgado     (fecha)
 *       - FechaExpira       (fecha — FechaOtorgado + 30 días)
 *       - CreditosOtorgados (número)
 *       - Reclamado         (casilla — true cuando el cron de vencidos ya le
 *          quitó los créditos a quien refirió por no haberlos usado a tiempo)
 *   - Tabla "usuarios", campo nuevo "EsInfluencer" (casilla — marcada a mano
 *     por el dueño para cuentas de influencers; cambia dos reglas de su
 *     CodigoReferido frente al de un usuario normal: no necesita tener plan
 *     activo para seguir dando el crédito, y quien lo usa recibe un
 *     descuento del 10% en su primer pago — ver DESCUENTO_INFLUENCER_PORCENTAJE).
 */
const USUARIOS_TABLE = "usuarios";
const PAGOS_TABLE = "Pagos";
const REFERIDOS_TABLE = "Referidos";

export const CREDITOS_POR_REFERIDO = 5;
const DIAS_VALIDEZ_CREDITO_REFERIDO = 30;
export const DESCUENTO_INFLUENCER_PORCENTAJE = 10;

/** Sin 0/O ni 1/I — se escribe a mano en el checkout, así que prima fácil
 * de transcribir sobre densidad. Más corto que el de Regalos (ese se
 * imprime/lee una vez; este se re-escribe cada vez que alguien lo comparte). */
const ALFABETO_CODIGO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generarCodigo(): string {
  let codigo = "";
  for (let i = 0; i < 6; i++) {
    codigo += ALFABETO_CODIGO[Math.floor(Math.random() * ALFABETO_CODIGO.length)];
  }
  return codigo;
}

export type CodigoReferidoInfo = { codigo: string; esInfluencer: boolean };

/** Devuelve el código de referido de esa cuenta (y si es de influencer),
 * generándolo la primera vez que se pide. null si la cuenta no existe
 * todavía en "usuarios". */
export async function getOrCreateCodigoReferido(email: string): Promise<CodigoReferidoInfo | null> {
  const base = getAirtableBase();
  const records = await base(USUARIOS_TABLE)
    .select({ filterByFormula: `LOWER({Correo}) = LOWER("${escapeFormulaValue(email)}")`, maxRecords: 1 })
    .all();
  const record = records[0];
  if (!record) return null;

  const esInfluencer = (record.get("EsInfluencer") as boolean) ?? false;

  const existente = (record.get("CodigoReferido") as string) || null;
  if (existente) return { codigo: existente, esInfluencer };

  for (let intento = 0; intento < 5; intento++) {
    const codigo = generarCodigo();
    const dupe = await base(USUARIOS_TABLE)
      .select({ filterByFormula: `UPPER({CodigoReferido}) = "${codigo}"`, maxRecords: 1 })
      .all();
    if (dupe.length > 0) continue;

    await base(USUARIOS_TABLE).update([{ id: record.id, fields: { CodigoReferido: codigo } }], {
      typecast: true,
    });
    return { codigo, esInfluencer };
  }

  throw new Error("No se pudo generar un código de referido único después de varios intentos.");
}

async function findReferenteByCodigo(codigo: string): Promise<{ correo: string; esInfluencer: boolean } | null> {
  const base = getAirtableBase();
  const records = await base(USUARIOS_TABLE)
    .select({
      filterByFormula: `UPPER({CodigoReferido}) = "${escapeFormulaValue(codigo.toUpperCase())}"`,
      maxRecords: 1,
    })
    .all();
  const record = records[0];
  if (!record) return null;
  return {
    correo: (record.get("Correo") as string) ?? "",
    esInfluencer: (record.get("EsInfluencer") as boolean) ?? false,
  };
}

/** true si `pagoIdActual` es el ÚNICO pago de tipo "Plan" en estado
 * "Aprobado" que tiene ese correo — es decir, si de verdad es su primer
 * plan pagado alguna vez, sin importar si canceló y volvió a pagar después
 * (Suscripciones se sobrescribe por correo y pierde ese historial, por eso
 * se revisa acá contra Pagos, que nunca se sobrescribe). */
async function esPrimerPagoDePlanAprobado(correo: string, pagoIdActual: string): Promise<boolean> {
  const base = getAirtableBase();
  const records = await base(PAGOS_TABLE)
    .select({
      filterByFormula: `AND(LOWER({Correo}) = LOWER("${escapeFormulaValue(correo)}"), {Tipo} = "Plan", {Estado} = "Aprobado")`,
    })
    .all();
  return records.every((r) => r.id === pagoIdActual);
}

async function yaFueReferidoAntes(correo: string): Promise<boolean> {
  const base = getAirtableBase();
  const records = await base(REFERIDOS_TABLE)
    .select({
      filterByFormula: `LOWER({ReferidoCorreo}) = LOWER("${escapeFormulaValue(correo)}")`,
      maxRecords: 1,
    })
    .all();
  return records.length > 0;
}

/** true si el teléfono o la cédula de quien pagó ya están en OTRA cuenta —
 * señal de que es la misma persona autorreferenciándose con un correo
 * nuevo. Solo bloquea el crédito de referido, no la cuenta en sí. */
async function pareceCuentaDuplicada(
  correoReferido: string,
  telefono: string | null,
  cedula: string | null
): Promise<boolean> {
  if (!telefono && !cedula) return false;

  const base = getAirtableBase();
  const clausulas: string[] = [];
  if (telefono) clausulas.push(`{Teléfono} = "${escapeFormulaValue(telefono)}"`);
  if (cedula) clausulas.push(`{Número de documento} = "${escapeFormulaValue(cedula)}"`);

  const formula = `AND(LOWER({Correo}) != LOWER("${escapeFormulaValue(correoReferido)}"), OR(${clausulas.join(",")}))`;
  const records = await base(USUARIOS_TABLE).select({ filterByFormula: formula, maxRecords: 1 }).all();
  return records.length > 0;
}

export type ValidacionCodigoReferido =
  | { ok: true; descuentoPorcentaje: number }
  | { ok: false; error: string };

/** Valida un código de referido ANTES de cobrar, para mostrarle a quien
 * paga si lo escribió bien — mismos chequeos de fondo que `procesarReferido`
 * (código existe, no es autorreferencia, quien refiere tiene plan activo
 * salvo que sea influencer, no fue referido antes), menos "es tu primer
 * plan" y "cuenta duplicada", que dependen del pago ya hecho/de datos que en
 * este punto pueden no estar completos todavía. Esos dos se siguen
 * revisando en `procesarReferido` como respaldo silencioso — que esto valide
 * en verde no garantiza el crédito si de todas formas no cumple esos dos al
 * momento de pagar. `descuentoPorcentaje` sale en 0 para un código normal, o
 * DESCUENTO_INFLUENCER_PORCENTAJE si es de una cuenta marcada "EsInfluencer"
 * — el llamador lo usa para descontar el precio antes de cobrar. */
export async function validarCodigoReferido(
  codigo: string,
  correoQuePaga: string
): Promise<ValidacionCodigoReferido> {
  const codigoLimpio = codigo.trim();
  if (!codigoLimpio) return { ok: false, error: "Escribe un código." };

  const referente = await findReferenteByCodigo(codigoLimpio);
  if (!referente || !referente.correo) {
    return { ok: false, error: "Ese código no existe. Revisa que esté bien escrito." };
  }
  if (referente.correo.toLowerCase() === correoQuePaga.toLowerCase()) {
    return { ok: false, error: "No puedes usar tu propio código." };
  }

  if (await yaFueReferidoAntes(correoQuePaga)) {
    return { ok: false, error: "Ya usaste un código de referido antes — solo se puede una vez." };
  }

  if (!referente.esInfluencer) {
    const subReferente = await getSubscriptionByEmail(referente.correo);
    if (!subReferente || subReferente.estado !== "Activa") {
      return { ok: false, error: "Ese código ya no está activo." };
    }
  }

  return { ok: true, descuentoPorcentaje: referente.esInfluencer ? DESCUENTO_INFLUENCER_PORCENTAJE : 0 };
}

/** Procesa un código de referido tras un pago de plan ya aprobado —
 * nunca lanza para no tumbar el flujo de cobro/crédito real; si algo no
 * cumple (código inválido, autorreferencia, no es el primer pago, ya fue
 * referido antes, quien refiere no tiene plan activo y no es influencer, o
 * huele a cuenta duplicada) simplemente no se otorga nada, en silencio. Se
 * llama desde los dos lugares que pueden ganar la carrera de "quién acredita
 * este pago" (chargeSubscriptionPlan y el webhook de Wompi), así que solo se
 * ejecuta una vez por pago real — ver `credited` en ambos. */
export async function procesarReferido(params: {
  correoReferido: string;
  codigo: string;
  pagoId: string;
}): Promise<void> {
  const codigo = params.codigo.trim();
  if (!codigo) return;

  try {
    const referente = await findReferenteByCodigo(codigo);
    if (!referente || !referente.correo) return;
    if (referente.correo.toLowerCase() === params.correoReferido.toLowerCase()) return;

    if (!(await esPrimerPagoDePlanAprobado(params.correoReferido, params.pagoId))) return;
    if (await yaFueReferidoAntes(params.correoReferido)) return;

    if (!referente.esInfluencer) {
      const subReferente = await getSubscriptionByEmail(referente.correo);
      if (!subReferente || subReferente.estado !== "Activa") return;
    }

    const referido = await getUserCreditsByEmail(params.correoReferido);
    if (await pareceCuentaDuplicada(params.correoReferido, referido?.telefono ?? null, referido?.cedula ?? null)) {
      return;
    }

    const base = getAirtableBase();
    const hoy = new Date();
    const expira = new Date(hoy);
    expira.setDate(expira.getDate() + DIAS_VALIDEZ_CREDITO_REFERIDO);

    await base(REFERIDOS_TABLE).create(
      [
        {
          fields: {
            ReferidoCorreo: params.correoReferido,
            ReferenteCorreo: referente.correo,
            CodigoUsado: codigo,
            PagoId: params.pagoId,
            FechaOtorgado: hoy.toISOString().slice(0, 10),
            FechaExpira: expira.toISOString().slice(0, 10),
            CreditosOtorgados: CREDITOS_POR_REFERIDO,
            Reclamado: false,
          },
        },
      ],
      { typecast: true }
    );

    // extendVencimiento: false — el crédito de referido no toca el
    // vencimiento del plan de quien refiere, vive aparte (dura 30 días
    // desde hoy, controlados por el cron de vencidos, no por Vencimiento).
    await addCreditsByEmail(referente.correo, CREDITOS_POR_REFERIDO, false);
  } catch {
    // Nunca debe tumbar el cobro/crédito real de la persona que pagó — si
    // algo falla acá, el referido simplemente no se otorga esta vez.
  }
}

/** Corre a diario: le quita los créditos a quien refirió si pasaron los 30
 * días sin que el cron ya los hubiera reclamado — nunca deja el saldo
 * negativo (deductCreditsByEmail lo clampa en 0). */
export async function expirarCreditosReferidoVencidos(): Promise<{ procesados: number; fallos: string[] }> {
  const base = getAirtableBase();
  const hoy = new Date().toISOString().slice(0, 10);

  const records = await base(REFERIDOS_TABLE).select({ filterByFormula: "{Reclamado} = 0" }).all();
  const vencidos = records.filter((r) => {
    const fechaExpira = (r.get("FechaExpira") as string) ?? "";
    return fechaExpira !== "" && fechaExpira <= hoy;
  });

  let procesados = 0;
  const fallos: string[] = [];

  for (const r of vencidos) {
    const referenteCorreo = (r.get("ReferenteCorreo") as string) ?? "";
    const creditos = (r.get("CreditosOtorgados") as number) || CREDITOS_POR_REFERIDO;
    try {
      await deductCreditsByEmail(referenteCorreo, creditos);
      await base(REFERIDOS_TABLE).update([{ id: r.id, fields: { Reclamado: true } }], { typecast: true });
      procesados += 1;
    } catch (err) {
      const motivo = err instanceof Error ? err.message : "error desconocido";
      fallos.push(`${referenteCorreo}: ${motivo}`);
    }
  }

  return { procesados, fallos };
}
