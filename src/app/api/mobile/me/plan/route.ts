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
  const plan = subscription ? (CREDIT_PLANS.find((p) => p.id === subscription.plan) ?? null) : null;
  // Una prueba activa también vive en "Suscripciones" (Estado "Prueba",
  // solo para seguimiento interno en Airtable — ver trackPruebaSubscription
  // en subscriptions.ts), pero su plan no está en CREDIT_PLANS: esta
  // pantalla es "mi plan mensual", así que se trata igual que no tener
  // suscripción. El estado de la prueba en sí se muestra aparte.
  if (!subscription || !plan) {
    return NextResponse.json({ hasSubscription: false });
  }
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
