import { NextResponse } from "next/server";
import { fetchFreshAcceptanceTokens, createPaymentSource } from "@/lib/wompi";
import { chargeSubscriptionPlan } from "@/lib/billing";
import { upsertSubscription, getSubscriptionByEmail } from "@/lib/subscriptions";
import { findCatalogItem } from "@/lib/orders";
import { requireMobileUser, MobileAuthError, mobileAuthErrorResponse } from "@/lib/mobile-auth";
import { validateCoupon, markCouponRedeemed, fechaInicioVigente, LANZAMIENTO_INICIO_DIFERIDO } from "@/lib/cupones";
import { validarCodigoReferido } from "@/lib/referidos";

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
  const couponCode = body?.couponCode as string | undefined;
  const codigoReferido = body?.codigoReferido as string | undefined;
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

  // Nunca confiar en que el cupón/código ya se validaron en la app — se
  // revisan de nuevo acá antes de cobrar, mismo criterio que subscribeToPlan
  // en la web (actions.ts).
  let descuento: number | undefined;
  let fechaInicioCupon: string | undefined;
  let cuponRecordId: string | undefined;
  let cuponUsosActuales: number | undefined;

  if (couponCode) {
    const validated = await validateCoupon(couponCode);
    if (!validated.ok) return NextResponse.json({ ok: false, error: validated.error }, { status: 400 });
    if (validated.cupon.tipo !== "Descuento") {
      return NextResponse.json(
        { ok: false, error: "Ese cupón no aplica a un pago con tarjeta." },
        { status: 400 }
      );
    }
    descuento = (validated.cupon.descuentoPorcentaje ?? 0) / 100;
    fechaInicioCupon = fechaInicioVigente(validated.cupon.inicioDiferido);
    cuponRecordId = validated.cupon.recordId;
    cuponUsosActuales = validated.cupon.usosActuales;
  }

  // No afecta el precio — ni los códigos normales ni los de influencer dan
  // descuento, solo créditos después del pago (ver procesarReferido,
  // llamado desde chargeSubscriptionPlan). Se valida igual para no dejar
  // pasar un error de digitación silencioso.
  if (codigoReferido) {
    const validado = await validarCodigoReferido(codigoReferido, user.email);
    if (!validado.ok) return NextResponse.json({ ok: false, error: validado.error }, { status: 400 });
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

  // Mientras dure el lanzamiento, el ciclo de cobro arranca el día del
  // lanzamiento para cualquiera que pague antes, use o no un cupón — el
  // cupón (si trae su propia fecha) manda sobre este default general.
  const fechaInicio = fechaInicioCupon ?? fechaInicioVigente(LANZAMIENTO_INICIO_DIFERIDO);

  const result = await chargeSubscriptionPlan({
    correo: user.email,
    descuento,
    codigoReferido,
    planId,
    paymentSourceId: paymentSource.id,
    ownerRef: user.userId,
    fechaInicio,
  });

  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  if (cuponRecordId && cuponUsosActuales !== undefined) {
    await markCouponRedeemed(cuponRecordId, cuponUsosActuales);
  }

  // Si el webhook de Wompi ganó la carrera y ya activó la suscripción, no
  // la toques de nuevo acá — ver el comentario de `credited` en billing.ts.
  if (result.credited) {
    await upsertSubscription({ correo: user.email, plan: planId, paymentSourceId: paymentSource.id, fechaInicio });
  }

  return NextResponse.json(result);
}
