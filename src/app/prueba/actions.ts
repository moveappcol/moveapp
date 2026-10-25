"use server";

import crypto from "node:crypto";
import { auth, currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { getMetaRequestContext } from "@/lib/meta-request-context";
import { fetchFreshAcceptanceTokens, createPaymentSource } from "@/lib/wompi";
import { esElegibleParaPrueba, TEXTO_ACEPTACION_PRUEBA } from "@/lib/pruebas";
import { chargeTrial, type TrialChargeResult } from "@/lib/billing";
import { getUserCreditsByEmail } from "@/lib/users";

export type BuyTrialResult = TrialChargeResult;

/** Hash de bin+últimos 4+vencimiento — señal secundaria para bloquear
 * repetir la prueba con la misma tarjeta física bajo otro correo (ver
 * esElegibleParaPrueba en pruebas.ts). Nunca es la única razón para
 * bloquear, y nunca se guarda el número de tarjeta en sí. */
function hashTarjeta(tarjeta?: {
  bin?: string | null;
  lastFour?: string | null;
  expMonth?: string | null;
  expYear?: string | null;
}): string | null {
  if (!tarjeta?.bin || !tarjeta?.lastFour) return null;
  const raw = `${tarjeta.bin}:${tarjeta.lastFour}:${tarjeta.expMonth ?? ""}:${tarjeta.expYear ?? ""}`;
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export async function buyTrial(params: {
  cardToken: string;
  aceptado: boolean;
  codigoReferido?: string;
  tarjeta?: {
    bin?: string | null;
    lastFour?: string | null;
    expMonth?: string | null;
    expYear?: string | null;
  };
}): Promise<BuyTrialResult> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "Debes iniciar sesión." };

  if (!params.aceptado) {
    return { ok: false, error: "Debes marcar la casilla para continuar." };
  }

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  if (!email) return { ok: false, error: "Tu cuenta no tiene un correo asociado." };

  const account = await getUserCreditsByEmail(email);
  const telefono = account?.telefono ?? null;
  const tarjetaHash = hashTarjeta(params.tarjeta);

  const elegibilidad = await esElegibleParaPrueba(email, telefono, tarjetaHash);
  if (!elegibilidad.ok) return { ok: false, error: elegibilidad.error };

  const { clientIpAddress, clientUserAgent, fbp, fbc } = await getMetaRequestContext();

  const tokens = await fetchFreshAcceptanceTokens();
  let paymentSource;
  try {
    paymentSource = await createPaymentSource({
      cardToken: params.cardToken,
      customerEmail: email,
      acceptanceToken: tokens.acceptanceToken,
      personalAuthToken: tokens.personalAuthToken,
    });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "No pudimos guardar la tarjeta." };
  }

  const result = await chargeTrial({
    correo: email,
    telefono,
    paymentSourceId: paymentSource.id,
    ownerRef: userId,
    tarjetaHash,
    codigoReferido: params.codigoReferido?.trim() || null,
    aceptacionTexto: TEXTO_ACEPTACION_PRUEBA,
    aceptacionIp: clientIpAddress,
    aceptacionUserAgent: clientUserAgent,
    fbp,
    fbc,
  });

  if (result.ok) revalidatePath("/mi-suscripcion");
  return result;
}
