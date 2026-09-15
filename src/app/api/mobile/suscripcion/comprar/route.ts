import { NextResponse } from "next/server";
import { fetchFreshAcceptanceTokens, createPaymentSource } from "@/lib/wompi";
import { chargeSubscriptionPlan } from "@/lib/billing";
import { upsertSubscription, getSubscriptionByEmail } from "@/lib/subscriptions";
import { findCatalogItem } from "@/lib/orders";
import { requireMobileUser, MobileAuthError, mobileAuthErrorResponse } from "@/lib/mobile-auth";

export async function POST(req: Request) {
  let user;
  try {
    user = await requireMobileUser();
  } catch (err) {
    if (err instanceof MobileAuthError) return mobileAuthErrorResponse();
    throw err;
  }

  const body = await req.json().catch(() => ({}));
  const planId = body?.planId as string | undefined;
  const cardToken = body?.cardToken as string | undefined;
  if (!planId || !cardToken) {
    return NextResponse.json({ ok: false, error: "Falta el plan o el token de la tarjeta." }, { status: 400 });
  }

  const item = findCatalogItem("plan", planId);
  if (!item) {
    return NextResponse.json({ ok: false, error: "Plan desconocido." }, { status: 400 });
  }

  // Un correo, un plan a la vez — evita cobrar y acreditar créditos otra
  // vez si ya tiene un plan activo. Cambiar de plan se hace sin volver a
  // cobrar (endpoint de cambiar plan), no reenviando esta compra.
  const existingSubscription = await getSubscriptionByEmail(user.email);
  if (existingSubscription && existingSubscription.estado === "Activa") {
    return NextResponse.json(
      { ok: false, error: "Ya tienes un plan activo. Usa el endpoint de cambiar de plan." },
      { status: 400 }
    );
  }

  const tokens = await fetchFreshAcceptanceTokens();

  let paymentSource;
  try {
    paymentSource = await createPaymentSource({
      cardToken,
      customerEmail: user.email,
      acceptanceToken: tokens.acceptanceToken,
      personalAuthToken: tokens.personalAuthToken,
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : "No pudimos guardar la tarjeta.";
    return NextResponse.json({ ok: false, error }, { status: 400 });
  }

  const result = await chargeSubscriptionPlan({
    correo: user.email,
    planId,
    paymentSourceId: paymentSource.id,
    ownerRef: user.userId,
  });

  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  await upsertSubscription({ correo: user.email, plan: planId, paymentSourceId: paymentSource.id });

  return NextResponse.json(result);
}
