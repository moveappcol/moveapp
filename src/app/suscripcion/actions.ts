"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { fetchAcceptanceTokens, createPaymentSource } from "@/lib/wompi";
import { chargeSubscriptionPlan } from "@/lib/billing";
import { upsertSubscription, cancelSubscription, scheduleChangePlan } from "@/lib/subscriptions";
import { findCatalogItem } from "@/lib/orders";

export type SubscribeResult =
  | { ok: true; credits: number }
  | { ok: false; error: string; pending?: boolean };

export async function subscribeToPlan(planId: string, cardToken: string): Promise<SubscribeResult> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "Debes iniciar sesión." };

  const item = findCatalogItem("plan", planId);
  if (!item) return { ok: false, error: "Plan desconocido." };

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  if (!email) return { ok: false, error: "Tu cuenta no tiene un correo asociado." };

  const tokens = await fetchAcceptanceTokens();

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

  const result = await chargeSubscriptionPlan({
    correo: email,
    planId,
    paymentSourceId: paymentSource.id,
    ownerRef: userId,
  });

  if (!result.ok) return result;

  await upsertSubscription({ correo: email, plan: planId, paymentSourceId: paymentSource.id });
  revalidatePath("/mi-suscripcion");
  return { ok: true, credits: result.credits };
}

export async function cancelMySubscription(): Promise<void> {
  const { userId } = await auth();
  if (!userId) return;
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  if (!email) return;
  await cancelSubscription(email);
  revalidatePath("/mi-suscripcion");
}

export async function changeMyPlan(newPlanId: string): Promise<void> {
  const { userId } = await auth();
  if (!userId) return;
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  if (!email) return;
  await scheduleChangePlan(email, newPlanId);
  revalidatePath("/mi-suscripcion");
}
