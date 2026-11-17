import crypto from "node:crypto";
import {
  CREDIT_PLANS,
  CREDIT_TOPUPS,
  TRIAL_PLAN,
  precioCreditosSueltos,
  MINIMO_CREDITOS_SUELTOS,
  MESES_REGALO,
  PRECIO_ENVIO_REGALO_FISICO,
  type CreditPackage,
} from "./credits-pricing";

/** "regalo" = comprar un plan como regalo (ver regalos.ts): usa el mismo
 * catálogo que "plan" (CREDIT_PLANS), pero no acredita al comprador ni
 * activa una suscripción — el webhook genera un código canjeable en vez de
 * eso. Se compra sin sesión de Clerk (ver clerkUserId="guest" en
 * buildReference), a propósito: quien regala no necesita crear cuenta.
 * "suelto" = créditos sueltos (ver precioCreditosSueltos en
 * credits-pricing.ts): no viene de un catálogo fijo como los demás — el
 * itemId codifica la cantidad ("suelto-<n>") y el precio se calcula acá
 * mismo, así el webhook de Wompi puede reconstruirlo solo desde la
 * referencia sin depender de ningún estado guardado aparte. */
export type PurchaseKind = "plan" | "topup" | "regalo" | "suelto" | "prueba";

const SUELTO_ID_PATTERN = /^suelto-(\d+)$/;

export function buildSueltoItemId(cantidad: number): string {
  return `suelto-${cantidad}`;
}

function findSueltoItem(itemId: string): CreditPackage | null {
  const match = SUELTO_ID_PATTERN.exec(itemId);
  if (!match) return null;
  const cantidad = Number(match[1]);
  if (!Number.isInteger(cantidad) || cantidad < MINIMO_CREDITOS_SUELTOS) return null;
  return {
    id: itemId,
    label: `${cantidad} créditos sueltos`,
    credits: cantidad,
    price: precioCreditosSueltos(cantidad),
  };
}

/** El itemId de un regalo codifica el plan, los meses y si es física:
 * "plan-starter" (1 mes, virtual — así eran todos antes), "plan-balance-m3",
 * "plan-volume-m2-fisica". Igual que "suelto-<n>", el precio sale de acá
 * mismo y el webhook lo reconstruye solo desde la referencia. */
const REGALO_ID_PATTERN = /^(plan-[a-z]+)(?:-m([123]))?(-fisica)?$/;

export type OpcionesRegalo = { planId: string; meses: number; fisica: boolean };

export function buildRegaloItemId({ planId, meses, fisica }: OpcionesRegalo): string {
  return `${planId}${meses > 1 ? `-m${meses}` : ""}${fisica ? "-fisica" : ""}`;
}

export function parseRegaloItemId(itemId: string): OpcionesRegalo | null {
  const match = REGALO_ID_PATTERN.exec(itemId);
  if (!match) return null;
  const meses = match[2] ? Number(match[2]) : 1;
  if (!(MESES_REGALO as readonly number[]).includes(meses)) return null;
  if (!CREDIT_PLANS.some((p) => p.id === match[1])) return null;
  return { planId: match[1], meses, fisica: Boolean(match[3]) };
}

/** `credits` es lo que recibe quien lo canjea CADA mes (los del plan);
 * `price` es el total: plan × meses + envío si es física. */
function findRegaloItem(itemId: string): CreditPackage | null {
  const opciones = parseRegaloItemId(itemId);
  if (!opciones) return null;
  const plan = CREDIT_PLANS.find((p) => p.id === opciones.planId)!;
  const meses = opciones.meses === 1 ? "1 mes" : `${opciones.meses} meses`;
  return {
    id: itemId,
    name: plan.name,
    label: `${plan.name} · ${meses}${opciones.fisica ? " · tarjeta física" : ""}`,
    credits: plan.credits,
    price: plan.price * opciones.meses + (opciones.fisica ? PRECIO_ENVIO_REGALO_FISICO : 0),
  };
}

export function findCatalogItem(kind: PurchaseKind, itemId: string): CreditPackage | null {
  if (kind === "suelto") return findSueltoItem(itemId);
  if (kind === "prueba") return itemId === TRIAL_PLAN.id ? TRIAL_PLAN : null;
  if (kind === "regalo") return findRegaloItem(itemId);
  const catalog = kind === "topup" ? CREDIT_TOPUPS : CREDIT_PLANS;
  return catalog.find((item) => item.id === itemId) ?? null;
}

type ParsedReference = { kind: PurchaseKind; itemId: string; clerkUserId: string };

/** Referencia única por compra: "mv.<kind>.<itemId>.<clerkUserId>.<timestamp>.<random>".
 * Se usa "." como separador porque los ids de Clerk ya usan "_" y los ids del
 * catálogo usan "-". Todo lo que necesitamos para acreditar créditos en el
 * webhook viaja codificado aquí — no confiamos en nada más que venga del cliente.
 * clerkUserId no se usa en ningún lado más abajo (el webhook nunca lo lee) —
 * es solo trazabilidad, así que una compra de regalo (sin sesión) pasa el
 * literal "guest" en vez de un id real. */
export function buildReference(kind: PurchaseKind, itemId: string, clerkUserId: string): string {
  const random = crypto.randomBytes(4).toString("hex");
  return `mv.${kind}.${itemId}.${clerkUserId}.${Date.now()}.${random}`;
}

export function parseReference(reference: string | undefined | null): ParsedReference | null {
  if (!reference) return null;
  const parts = reference.split(".");
  if (parts.length !== 6 || parts[0] !== "mv") return null;
  const [, kind, itemId, clerkUserId] = parts;
  if (
    kind !== "plan" &&
    kind !== "topup" &&
    kind !== "regalo" &&
    kind !== "suelto" &&
    kind !== "prueba"
  )
    return null;
  return { kind, itemId, clerkUserId };
}
