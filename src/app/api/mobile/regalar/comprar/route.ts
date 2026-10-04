import { NextResponse } from "next/server";
import { fetchFreshAcceptanceTokens, createPaymentSource } from "@/lib/wompi";
import { chargeGiftPlan } from "@/lib/billing";
import { requireMobileUser, MobileAuthError, mobileAuthErrorResponse } from "@/lib/mobile-auth";

/** Comprar un plan como regalo desde la app — a diferencia de la web (que
 * no requiere cuenta y redirige al checkout alojado de Wompi), acá sí hace
 * falta estar logueado: se usa el nombre/correo de la cuenta para la
 * factura y el correo de confirmación, y se cobra con tarjeta tokenizada
 * nativa, igual que /suscripcion/comprar — nunca se le muestran créditos
 * ni suscripción al comprador, solo el código para regalar (ver
 * chargeGiftPlan en billing.ts). */
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

  const result = await chargeGiftPlan({
    correo: user.email,
    nombre: user.userName,
    planId,
    paymentSourceId: paymentSource.id,
    ownerRef: user.userId,
  });

  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json(result);
}
