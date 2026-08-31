import { NextResponse } from "next/server";
import { getSubscriptionByEmail } from "@/lib/subscriptions";
import { CREDIT_PLANS } from "@/lib/credits-pricing";
import { requireMobileUser, mobileAuthErrorResponse } from "@/lib/mobile-auth";

export async function GET() {
  let user;
  try {
    user = await requireMobileUser();
  } catch {
    return mobileAuthErrorResponse();
  }

  const subscription = await getSubscriptionByEmail(user.email);
  if (!subscription) {
    return NextResponse.json({ hasSubscription: false });
  }

  const plan = CREDIT_PLANS.find((p) => p.id === subscription.plan) ?? null;
  const planSiguiente = subscription.planSiguiente
    ? (CREDIT_PLANS.find((p) => p.id === subscription.planSiguiente) ?? null)
    : null;

  return NextResponse.json({
    hasSubscription: true,
    estado: subscription.estado,
    plan: plan ? { id: plan.id, name: plan.name, label: plan.label, price: plan.price } : null,
    proximoCobro: subscription.proximoCobro,
    planSiguiente: planSiguiente
      ? { id: planSiguiente.id, name: planSiguiente.name, label: planSiguiente.label }
      : null,
  });
}
