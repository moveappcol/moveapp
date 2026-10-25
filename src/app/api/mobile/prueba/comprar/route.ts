import { NextResponse } from "next/server";
import { fetchFreshAcceptanceTokens, createPaymentSource } from "@/lib/wompi";
import { chargeTrial } from "@/lib/billing";
import { esElegibleParaPrueba, TEXTO_ACEPTACION_PRUEBA } from "@/lib/pruebas";
import { getUserCreditsByEmail } from "@/lib/users";
import { requireMobileUser, MobileAuthError, mobileAuthErrorResponse } from "@/lib/mobile-auth";

/** Equivalente móvil de buyTrial (prueba/actions.ts de la web). Sin
 * tarjetaHash (la app no tiene acceso al bin/últimos 4 de la tokenización
 * como sí los expone, sin garantía, el navegador) — es solo una señal
 * secundaria opcional, nunca la única razón de bloqueo (ver
 * esElegibleParaPrueba en pruebas.ts). */
export async function POST(req: Request) {
  let user;
  try {
    user = await requireMobileUser();
  } catch (err) {
    if (err instanceof MobileAuthError) return mobileAuthErrorResponse();
    throw err;
  }

  const body = await req.json().catch(() => ({}));
  const cardToken = body?.cardToken as string | undefined;
  const aceptado = Boolean(body?.aceptado);
  const codigoReferido = (body?.codigoReferido as string | undefined)?.trim() || null;
  if (!cardToken) {
    return NextResponse.json({ ok: false, error: "Falta el token de la tarjeta." }, { status: 400 });
  }
  if (!aceptado) {
    return NextResponse.json({ ok: false, error: "Debes marcar la casilla para continuar." }, { status: 400 });
  }

  const account = await getUserCreditsByEmail(user.email);
  const telefono = account?.telefono ?? null;

  const elegibilidad = await esElegibleParaPrueba(user.email, telefono);
  if (!elegibilidad.ok) {
    return NextResponse.json({ ok: false, error: elegibilidad.error }, { status: 400 });
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

  const result = await chargeTrial({
    correo: user.email,
    telefono,
    paymentSourceId: paymentSource.id,
    ownerRef: user.userId,
    codigoReferido,
    aceptacionTexto: TEXTO_ACEPTACION_PRUEBA,
    aceptacionIp: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    aceptacionUserAgent: req.headers.get("user-agent"),
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
