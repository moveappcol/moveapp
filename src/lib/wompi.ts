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

function wompiPrivateKey(): string {
  return requireEnv("WOMPI_PRIVATE_KEY");
}

export type AcceptanceTokens = {
  acceptanceToken: string;
  personalAuthToken: string;
  permalinkAcceptance: string;
  permalinkPersonalAuth: string;
};

/** Los tokens de aceptación (términos + tratamiento de datos) que Wompi
 * exige mostrarle a la persona antes de guardar su tarjeta. Expiran a los
 * ~30 minutos, así que se piden justo antes de usarlos, nunca se cachean. */
export async function fetchAcceptanceTokens(): Promise<AcceptanceTokens> {
  const res = await fetch(`${wompiApiBase()}/merchants/${wompiPublicKey()}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("No pudimos obtener los términos de Wompi.");
  const json = await res.json();
  const data = json.data;
  return {
    acceptanceToken: data.presigned_acceptance.acceptance_token,
    personalAuthToken: data.presigned_personal_data_auth.acceptance_token,
    permalinkAcceptance: data.presigned_acceptance.permalink,
    permalinkPersonalAuth: data.presigned_personal_data_auth.permalink,
  };
}

export type WompiPaymentSource = { id: number; status: string };

/** Guarda una tarjeta tokenizada como "fuente de pago" reutilizable, para
 * poder cobrarla luego sin que la persona esté presente (suscripción). */
export async function createPaymentSource(params: {
  cardToken: string;
  customerEmail: string;
  acceptanceToken: string;
  personalAuthToken: string;
}): Promise<WompiPaymentSource> {
  const res = await fetch(`${wompiApiBase()}/payment_sources`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${wompiPrivateKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type: "CARD",
      token: params.cardToken,
      customer_email: params.customerEmail,
      acceptance_token: params.acceptanceToken,
      accept_personal_auth: params.personalAuthToken,
    }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error?.messages ? JSON.stringify(json.error.messages) : "No pudimos guardar la tarjeta.");
  }
  return { id: json.data.id, status: json.data.status };
}

/** Cobra una fuente de pago guardada, server-to-server, sin que la persona
 * esté presente (renovación mensual). Requiere la llave privada — nunca
 * llamar esto desde el cliente. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Cobra una fuente de pago guardada, server-to-server, sin que la persona
 * esté presente (renovación mensual). Requiere la llave privada — nunca
 * llamar esto desde el cliente. Wompi puede responder "PENDING" y resolver
 * el estado final unos segundos después, así que se hace un poll corto acá;
 * si sigue pendiente, el webhook lo termina de confirmar más tarde. */
export async function chargeWithPaymentSource(params: {
  amountInCents: number;
  customerEmail: string;
  paymentSourceId: number;
  reference: string;
}): Promise<WompiTransaction> {
  const signature = buildIntegritySignature(params.reference, params.amountInCents, "COP");
  const res = await fetch(`${wompiApiBase()}/transactions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${wompiPrivateKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount_in_cents: params.amountInCents,
      currency: "COP",
      customer_email: params.customerEmail,
      payment_source_id: params.paymentSourceId,
      payment_method: { installments: 1 },
      reference: params.reference,
      signature,
    }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error?.messages ? JSON.stringify(json.error.messages) : "No pudimos cobrar la tarjeta.");
  }
  let tx = json.data;

  for (let i = 0; i < 5 && tx.status === "PENDING"; i++) {
    await sleep(2000);
    const polled = await fetchTransaction(tx.id);
    if (polled) tx = { ...tx, status: polled.status };
  }

  return { id: tx.id, status: tx.status, reference: tx.reference, amountInCents: tx.amount_in_cents };
}
