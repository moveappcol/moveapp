import { NextResponse } from "next/server";
import { validateCoupon, fechaInicioVigente } from "@/lib/cupones";
import { requireMobileUser, MobileAuthError, mobileAuthErrorResponse } from "@/lib/mobile-auth";

/** Equivalente móvil de applyCoupon (actions.ts de la web) — valida el
 * cupón para mostrarlo en la UI antes de cobrar, sin marcarlo como usado
 * todavía (eso pasa solo si la compra sí sale adelante, ver
 * /suscripcion/comprar). */
export async function POST(req: Request) {
  try {
    await requireMobileUser();
  } catch (err) {
    if (err instanceof MobileAuthError) return mobileAuthErrorResponse();
    throw err;
  }

  const body = await req.json().catch(() => ({}));
  const code = body?.code as string | undefined;
  if (!code) return NextResponse.json({ ok: false, error: "Escribe un código." });

  const result = await validateCoupon(code);
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error });

  if (result.cupon.tipo === "Créditos gratis") {
    return NextResponse.json({
      ok: true,
      tipo: "Créditos gratis",
      creditos: result.cupon.creditos ?? 0,
    });
  }
  return NextResponse.json({
    ok: true,
    tipo: "Descuento",
    descuentoPorcentaje: result.cupon.descuentoPorcentaje ?? 0,
    fechaInicio: fechaInicioVigente(result.cupon.inicioDiferido),
  });
}
