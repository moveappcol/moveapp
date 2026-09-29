import crypto from "node:crypto";
import { CREDIT_PLANS, CREDIT_TOPUPS, type CreditPackage } from "./credits-pricing";

/** "regalo" = comprar un plan como regalo (ver regalos.ts): usa el mismo
 * catálogo que "plan" (CREDIT_PLANS), pero no acredita al comprador ni
 * activa una suscripción — el webhook genera un código canjeable en vez de
 * eso. Se compra sin sesión de Clerk (ver clerkUserId="guest" en
 * buildReference), a propósito: quien regala no necesita crear cuenta. */
export type PurchaseKind = "plan" | "topup" | "regalo";

export function findCatalogItem(kind: PurchaseKind, itemId: string): CreditPackage | null {
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
  if (kind !== "plan" && kind !== "topup" && kind !== "regalo") return null;
  return { kind, itemId, clerkUserId };
}
