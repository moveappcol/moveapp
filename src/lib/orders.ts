import crypto from "node:crypto";
import { CREDIT_PLANS, CREDIT_TOPUPS, type CreditPackage } from "./credits-pricing";

export type PurchaseKind = "plan" | "topup";

export function findCatalogItem(kind: PurchaseKind, itemId: string): CreditPackage | null {
  const catalog = kind === "plan" ? CREDIT_PLANS : CREDIT_TOPUPS;
  return catalog.find((item) => item.id === itemId) ?? null;
}

type ParsedReference = { kind: PurchaseKind; itemId: string; clerkUserId: string };

/** Referencia única por compra: "mv.<kind>.<itemId>.<clerkUserId>.<timestamp>.<random>".
 * Se usa "." como separador porque los ids de Clerk ya usan "_" y los ids del
 * catálogo usan "-". Todo lo que necesitamos para acreditar créditos en el
 * webhook viaja codificado aquí — no confiamos en nada más que venga del cliente. */
export function buildReference(kind: PurchaseKind, itemId: string, clerkUserId: string): string {
  const random = crypto.randomBytes(4).toString("hex");
  return `mv.${kind}.${itemId}.${clerkUserId}.${Date.now()}.${random}`;
}

export function parseReference(reference: string | undefined | null): ParsedReference | null {
  if (!reference) return null;
  const parts = reference.split(".");
  if (parts.length !== 6 || parts[0] !== "mv") return null;
  const [, kind, itemId, clerkUserId] = parts;
  if (kind !== "plan" && kind !== "topup") return null;
  return { kind, itemId, clerkUserId };
}
