"use server";

import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { buildIntegritySignature, wompiPublicKey, WOMPI_CHECKOUT_URL } from "@/lib/wompi";
import { buildReference, findCatalogItem, type PurchaseKind } from "@/lib/orders";
import { createPendingPago } from "@/lib/pagos";

export async function startCheckout(kind: PurchaseKind, itemId: string): Promise<void> {
  const { userId } = await auth();
  if (!userId) redirect("/iniciar-sesion");

  const item = findCatalogItem(kind, itemId);
  if (!item) redirect("/#planes");

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  if (!email) redirect("/#planes");

  const reference = buildReference(kind, itemId, userId);
  const amountInCents = item.price * 100;
  const signature = buildIntegritySignature(reference, amountInCents, "COP");

  await createPendingPago({
    referencia: reference,
    correo: email,
    tipo: kind,
    item: itemId,
    creditos: item.credits,
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
