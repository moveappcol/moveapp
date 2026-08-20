"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { fetchAcceptanceTokens, createPaymentSource } from "@/lib/wompi";
import { chargeSubscriptionPlan } from "@/lib/billing";
import { upsertSubscription, cancelSubscription, scheduleChangePlan } from "@/lib/subscriptions";
import { findCatalogItem } from "@/lib/orders";
import { validateCoupon, markCouponRedeemed } from "@/lib/cupones";
import { addCreditsByEmail } from "@/lib/users";

export type SubscribeResult =
  | { ok: true; credits: number }
  | { ok: false; error: string; pending?: boolean };

export type CouponPreview =
  | { ok: true; tipo: "Créditos gratis"; creditos: number }
  | { ok: true; tipo: "Descuento"; descuentoPorcentaje: number }
  | { ok: false; error: string };

/** Valida un cupón para mostrarlo en la UI antes de cobrar — no lo marca
 * como usado todavía (eso pasa solo si la compra/canje tiene éxito). */
export async function applyCoupon(code: string): Promise<CouponPreview> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "Debes iniciar sesión." };

  const result = await validateCoupon(code);
  if (!result.ok) return { ok: false, error: result.error };

  if (result.cupon.tipo === "Créditos gratis") {
    return { ok: true, tipo: "Créditos gratis", creditos: result.cupon.creditos ?? 0 };
  }
  return { ok: true, tipo: "Descuento", descuentoPorcentaje: result.cupon.descuentoPorcentaje ?? 0 };
}

export async function subscribeToPlan(
  planId: string,
  cardToken: string,
  couponCode?: string
): Promise<SubscribeResult> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "Debes iniciar sesión." };

  const item = findCatalogItem("plan", planId);
  if (!item) return { ok: false, error: "Plan desconocido." };

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  if (!email) return { ok: false, error: "Tu cuenta no tiene un correo asociado." };

  let descuento: number | undefined;
  let cuponRecordId: string | undefined;
  let cuponUsosActuales: number | undefined;

  if (couponCode) {
    const validated = await validateCoupon(couponCode);
    if (!validated.ok) return { ok: false, error: validated.error };
    if (validated.cupon.tipo !== "Descuento") {
      return { ok: false, error: "Ese cupón no aplica a un pago con tarjeta." };
    }
    descuento = (validated.cupon.descuentoPorcentaje ?? 0) / 100;
    cuponRecordId = validated.cupon.recordId;
    cuponUsosActuales = validated.cupon.usosActuales;
  }

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
    descuento,
  });

  if (!result.ok) return result;

  if (cuponRecordId && cuponUsosActuales !== undefined) {
    await markCouponRedeemed(cuponRecordId, cuponUsosActuales);
  }

  await upsertSubscription({ correo: email, plan: planId, paymentSourceId: paymentSource.id });
  revalidatePath("/mi-suscripcion");
  return { ok: true, credits: result.credits };
}

export type RedeemFreeCouponResult = { ok: true; credits: number } | { ok: false; error: string };

/** Canjea un cupón de "Créditos gratis": suma los créditos directo a la
 * cuenta, sin pasar por Wompi ni pedir tarjeta. No activa ni renueva
 * ninguna suscripción — es un abono único. */
export async function redeemFreeCoupon(code: string): Promise<RedeemFreeCouponResult> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "Debes iniciar sesión." };

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  if (!email) return { ok: false, error: "Tu cuenta no tiene un correo asociado." };

  const validated = await validateCoupon(code);
  if (!validated.ok) return { ok: false, error: validated.error };
  if (validated.cupon.tipo !== "Créditos gratis") {
    return { ok: false, error: "Ese cupón no es de créditos gratis." };
  }

  const creditos = validated.cupon.creditos ?? 0;
  await addCreditsByEmail(email, creditos, false);
  await markCouponRedeemed(validated.cupon.recordId, validated.cupon.usosActuales);

  revalidatePath("/mi-suscripcion");
  return { ok: true, credits: creditos };
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
