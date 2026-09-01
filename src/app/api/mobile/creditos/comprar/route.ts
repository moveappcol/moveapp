import { NextResponse } from "next/server";
import { fetchAcceptanceTokens, createPaymentSource } from "@/lib/wompi";
import { chargeTopup } from "@/lib/billing";
import { findCatalogItem } from "@/lib/orders";
import { getSubscriptionByEmail } from "@/lib/subscriptions";
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
  const topupId = body?.topupId as string | undefined;
  const cardToken = body?.cardToken as string | undefined;
  if (!topupId || !cardToken) {
    return NextResponse.json({ ok: false, error: "Falta el paquete o el token de la tarjeta." }, { status: 400 });
  }

  const item = findCatalogItem("topup", topupId);
  if (!item) {
    return NextResponse.json({ ok: false, error: "Paquete de créditos desconocido." }, { status: 400 });
  }

  const subscription = await getSubscriptionByEmail(user.email);
  if (!subscription || subscription.estado !== "Activa") {
    return NextResponse.json(
      { ok: false, error: "Necesitas un plan activo para comprar créditos adicionales." },
      { status: 400 }
    );
  }

  const tokens = await fetchAcceptanceTokens();

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

  const result = await chargeTopup({
    correo: user.email,
    topupId,
    paymentSourceId: paymentSource.id,
    ownerRef: user.userId,
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
