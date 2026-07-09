import crypto from "node:crypto";

export const WOMPI_CHECKOUT_URL = "https://checkout.wompi.co/p/";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Falta la variable de entorno ${name}.`);
  return value;
}

export function wompiPublicKey(): string {
  return requireEnv("NEXT_PUBLIC_WOMPI_PUBLIC_KEY");
}

function wompiIntegritySecret(): string {
  return requireEnv("WOMPI_INTEGRITY_SECRET");
}

function wompiEventsSecret(): string {
  return requireEnv("WOMPI_EVENTS_SECRET");
}

export function wompiEnvironment(): "test" | "prod" {
  return wompiPublicKey().startsWith("pub_prod_") ? "prod" : "test";
}

function wompiApiBase(): string {
  return wompiEnvironment() === "prod"
    ? "https://production.wompi.co/v1"
    : "https://sandbox.wompi.co/v1";
}

/** Firma de integridad exigida por el Web Checkout de Wompi. Debe generarse
 * en el servidor: SHA256(referencia + montoEnCentavos + moneda + secreto). */
export function buildIntegritySignature(
  reference: string,
  amountInCents: number,
  currency: string
): string {
  const raw = `${reference}${amountInCents}${currency}${wompiIntegritySecret()}`;
  return crypto.createHash("sha256").update(raw).digest("hex");
}

type WompiEventPayload = {
  event: string;
  data: { transaction: Record<string, unknown> };
  signature: { properties: string[]; checksum: string };
  timestamp: number;
};

function getByPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object") return (acc as Record<string, unknown>)[key];
    return undefined;
  }, obj);
}

/** Verifica el checksum de un evento (webhook) de Wompi. Las rutas en
 * signature.properties son relativas a `data` (ej: "transaction.id"). */
export function verifyEventChecksum(payload: WompiEventPayload): boolean {
  const { properties, checksum } = payload.signature ?? {};
  if (!properties || !checksum) return false;

  const values = properties.map((path) => getByPath(payload.data, path) ?? "");
  const raw = `${values.join("")}${payload.timestamp}${wompiEventsSecret()}`;
  const expected = crypto.createHash("sha256").update(raw).digest("hex");
  return expected.toUpperCase() === checksum.toUpperCase();
}

export type WompiTransaction = {
  id: string;
  status: string;
  reference: string;
  amountInCents: number;
};

export async function fetchTransaction(id: string): Promise<WompiTransaction | null> {
  const res = await fetch(`${wompiApiBase()}/transactions/${id}`, {
    headers: { Authorization: `Bearer ${wompiPublicKey()}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const json = await res.json();
  const tx = json.data;
  if (!tx) return null;
  return {
    id: tx.id,
    status: tx.status,
    reference: tx.reference,
    amountInCents: tx.amount_in_cents,
  };
}
