"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { fetchFreshAcceptanceTokens, createPaymentSource } from "@/lib/wompi";
import { chargeSubscriptionPlan } from "@/lib/billing";
import {
  upsertSubscription,
  cancelSubscription,
  scheduleChangePlan,
  getSubscriptionByEmail,
} from "@/lib/subscriptions";
import { findCatalogItem } from "@/lib/orders";
import { validateCoupon, markCouponRedeemed, fechaInicioVigente, LANZAMIENTO_INICIO_DIFERIDO } from "@/lib/cupones";
import { addCreditsByEmail } from "@/lib/users";

export type SubscribeResult =
  | { ok: true; credits: number }
  | { ok: false; error: string; pending?: boolean };

export type CouponPreview =
  | { ok: true; tipo: "Créditos gratis"; creditos: number }
  | { ok: true; tipo: "Descuento"; descuentoPorcentaje: number; fechaInicio?: string }
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
  return {
    ok: true,
    tipo: "Descuento",
    descuentoPorcentaje: result.cupon.descuentoPorcentaje ?? 0,
    fechaInicio: fechaInicioVigente(result.cupon.inicioDiferido),
  };
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

  // Un correo, un plan a la vez — evita cobrar y acreditar créditos otra
  // vez si alguien vuelve a /suscribirse/[planId] teniendo ya un plan
  // activo (ej. un link viejo, o un reintento tras un error). Cambiar de
  // plan se hace desde "Mi suscripción", sin volver a cobrar.
  const existingSubscription = await getSubscriptionByEmail(email);
  if (existingSubscription && existingSubscription.estado === "Activa") {
    return {
      ok: false,
      error: "Ya tienes un plan activo. Para cambiarlo, usa \"Cambiar de plan\" en Mi suscripción.",
    };
  }

  let descuento: number | undefined;
  let fechaInicio: string | undefined;
  let cuponRecordId: string | undefined;
  let cuponUsosActuales: number | undefined;

  if (couponCode) {
    const validated = await validateCoupon(couponCode);
    if (!validated.ok) return { ok: false, error: validated.error };
    if (validated.cupon.tipo !== "Descuento") {
      return { ok: false, error: "Ese cupón no aplica a un pago con tarjeta." };
    }
    descuento = (validated.cupon.descuentoPorcentaje ?? 0) / 100;
    fechaInicio = fechaInicioVigente(validated.cupon.inicioDiferido);
    cuponRecordId = validated.cupon.recordId;
    cuponUsosActuales = validated.cupon.usosActuales;
  }

  // Mientras dure el lanzamiento, el ciclo de cobro arranca el día del
  // lanzamiento para cualquiera que pague antes, use o no un cupón — el
  // cupón (si trae su propia fecha) manda sobre este default general.
  fechaInicio = fechaInicio ?? fechaInicioVigente(LANZAMIENTO_INICIO_DIFERIDO);

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

  const result = await chargeSubscriptionPlan({
    correo: email,
    planId,
    paymentSourceId: paymentSource.id,
    ownerRef: userId,
    descuento,
    fechaInicio,
  });

  if (!result.ok) return result;

  if (cuponRecordId && cuponUsosActuales !== undefined) {
    await markCouponRedeemed(cuponRecordId, cuponUsosActuales);
  }

  // Si el webhook de Wompi ganó la carrera y ya activó la suscripción, no
  // la toques de nuevo acá — ver el comentario de `credited` en billing.ts.
  if (result.credited) {
    await upsertSubscription({ correo: email, plan: planId, paymentSourceId: paymentSource.id, fechaInicio });
  }
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
