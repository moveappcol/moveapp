import crypto from "node:crypto";
import {
  CREDIT_PLANS,
  CREDIT_TOPUPS,
  TRIAL_PLAN,
  precioCreditosSueltos,
  MINIMO_CREDITOS_SUELTOS,
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

export function findCatalogItem(kind: PurchaseKind, itemId: string): CreditPackage | null {
  if (kind === "suelto") return findSueltoItem(itemId);
  if (kind === "prueba") return itemId === TRIAL_PLAN.id ? TRIAL_PLAN : null;
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
