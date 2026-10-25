"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth, currentUser } from "@clerk/nextjs/server";
import {
  buildIntegritySignature,
  wompiPublicKey,
  WOMPI_CHECKOUT_URL,
  fetchFreshAcceptanceTokens,
  createPaymentSource,
} from "@/lib/wompi";
import { buildReference, findCatalogItem, type PurchaseKind } from "@/lib/orders";
import { createPendingPago } from "@/lib/pagos";
import { getSubscriptionByEmail } from "@/lib/subscriptions";
import { chargeCreditosSueltos } from "@/lib/billing";
import { MINIMO_CREDITOS_SUELTOS } from "@/lib/credits-pricing";
import { getMetaRequestContext } from "@/lib/meta-request-context";

export async function startCheckout(kind: PurchaseKind, itemId: string): Promise<void> {
  const { userId } = await auth();
  if (!userId) redirect("/iniciar-sesion");

  const item = findCatalogItem(kind, itemId);
  if (!item) redirect("/#planes");

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  if (!email) redirect("/#planes");

  if (kind === "topup") {
    const subscription = await getSubscriptionByEmail(email);
    if (!subscription || subscription.estado !== "Activa") {
      redirect("/mi-suscripcion?requiere_plan=1");
    }
  }

  const reference = buildReference(kind, itemId, userId);
  const amountInCents = item.price * 100;
  const signature = buildIntegritySignature(reference, amountInCents, "COP");

  const { fbp, fbc } = await getMetaRequestContext();
  await createPendingPago({
    referencia: reference,
    correo: email,
    tipo: kind,
    item: itemId,
    creditos: item.credits,
    valor: item.price,
    fbp,
    fbc,
  });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const params = new URLSearchParams({
    "public-key": wompiPublicKey(),
    currency: "COP",
    "amount-in-cents": String(amountInCents),
    reference,
    "signature:integrity": signature,
    "redirect-url": `${siteUrl}/pagos/resultado`,
    "customer-data:email": email,
  });

  redirect(`${WOMPI_CHECKOUT_URL}?${params.toString()}`);
}

export type BuyCreditosSueltosResult =
  | { ok: true; credits: number }
  | { ok: false; error: string; pending?: boolean; reference?: string };

/** Compra de créditos sueltos — mismo modelo de tarjeta tokenizada que
 * buyTopup, pero sin requerir plan activo (ver chargeCreditosSueltos). */
export async function buyCreditosSueltos(
  cantidad: number,
  cardToken: string
): Promise<BuyCreditosSueltosResult> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "Debes iniciar sesión." };

  if (!Number.isInteger(cantidad) || cantidad < MINIMO_CREDITOS_SUELTOS) {
    return { ok: false, error: `El mínimo es ${MINIMO_CREDITOS_SUELTOS} créditos sueltos.` };
  }

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  if (!email) return { ok: false, error: "Tu cuenta no tiene un correo asociado." };

  const tokens = await fetchFreshAcceptanceTokens();

  let paymentSource;
  try {
    paymentSource = await createPaymentSource({
      cardToken,
      customerEmail: email,
      acceptanceToken: tokens.acceptanceToken,
      personalAuthToken: tokens.personalAuthToken,
    });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "No pudimos guardar la tarjeta." };
  }

  const { fbp, fbc } = await getMetaRequestContext();
  const result = await chargeCreditosSueltos({
    correo: email,
    cantidad,
    paymentSourceId: paymentSource.id,
    ownerRef: userId,
    fbp,
    fbc,
  });

  if (!result.ok) return result;

  revalidatePath("/mi-suscripcion");
  return { ok: true, credits: result.credits };
}
