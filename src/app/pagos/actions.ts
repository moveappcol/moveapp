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
import { chargeTopup } from "@/lib/billing";

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

  await createPendingPago({
    referencia: reference,
    correo: email,
    tipo: kind,
    item: itemId,
    creditos: item.credits,
    valor: item.price,
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

export type BuyTopupResult =
  | { ok: true; credits: number }
  | { ok: false; error: string; pending?: boolean };

/** Compra de créditos adicionales con el mismo modelo que suscribirse a un
 * plan: tarjeta tokenizada en la propia página, sin salir a la pasarela de
 * Wompi. */
export async function buyTopup(topupId: string, cardToken: string): Promise<BuyTopupResult> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "Debes iniciar sesión." };

  const item = findCatalogItem("topup", topupId);
  if (!item) return { ok: false, error: "Paquete de créditos desconocido." };

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  if (!email) return { ok: false, error: "Tu cuenta no tiene un correo asociado." };

  const subscription = await getSubscriptionByEmail(email);
  if (!subscription || subscription.estado !== "Activa") {
    return { ok: false, error: "Necesitas un plan activo para comprar créditos adicionales." };
  }

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

  const result = await chargeTopup({
    correo: email,
    topupId,
    paymentSourceId: paymentSource.id,
    ownerRef: userId,
  });

  if (!result.ok) return result;

  revalidatePath("/mi-suscripcion");
  return { ok: true, credits: result.credits };
}
