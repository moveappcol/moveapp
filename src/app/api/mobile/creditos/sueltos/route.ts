import { NextResponse } from "next/server";
import { fetchFreshAcceptanceTokens, createPaymentSource } from "@/lib/wompi";
import { chargeCreditosSueltos } from "@/lib/billing";
import { requireMobileUser, MobileAuthError, mobileAuthErrorResponse } from "@/lib/mobile-auth";

/** Equivalente móvil de buyCreditosSueltos (pagos/actions.ts de la web) —
 * a diferencia de /creditos/comprar (topups), no exige plan activo. */
export async function POST(req: Request) {
  let user;
  try {
    user = await requireMobileUser();
  } catch (err) {
    if (err instanceof MobileAuthError) return mobileAuthErrorResponse();
    throw err;
  }

  const body = await req.json().catch(() => ({}));
  const cantidad = Number(body?.cantidad);
  const cardToken = body?.cardToken as string | undefined;
  if (!Number.isInteger(cantidad) || cantidad < 1 || !cardToken) {
    return NextResponse.json(
      { ok: false, error: "Falta la cantidad de créditos o el token de la tarjeta." },
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

  const result = await chargeCreditosSueltos({
    correo: user.email,
    cantidad,
    paymentSourceId: paymentSource.id,
    ownerRef: user.userId,
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
