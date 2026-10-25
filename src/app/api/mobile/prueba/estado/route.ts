import { NextResponse } from "next/server";
import { esElegibleParaPrueba, getPruebaByEmail } from "@/lib/pruebas";
import { getUserCreditsByEmail } from "@/lib/users";
import { requireMobileUser, MobileAuthError, mobileAuthErrorResponse } from "@/lib/mobile-auth";

/** Un solo endpoint para lo que necesitan tanto la pantalla de compra
 * (¿puede comprar?) como la de perfil (¿tiene una prueba activa/cancelada
 * vigente que mostrar, con cuántos créditos le quedan?). */
export async function GET() {
  let user;
  try {
    user = await requireMobileUser();
  } catch (err) {
    if (err instanceof MobileAuthError) return mobileAuthErrorResponse();
    throw err;
  }

  const account = await getUserCreditsByEmail(user.email);
  const elegibilidad = await esElegibleParaPrueba(user.email, account?.telefono ?? null);

  const ahora = new Date().toISOString();
  const pruebaRaw = await getPruebaByEmail(user.email);
  const vigente =
    pruebaRaw &&
    (pruebaRaw.estado === "Activa" || pruebaRaw.estado === "Cancelada") &&
    pruebaRaw.fechaFin > ahora
      ? pruebaRaw
      : null;

  return NextResponse.json({
    elegible: elegibilidad.ok,
    errorElegibilidad: elegibilidad.ok ? null : elegibilidad.error,
    prueba: vigente
      ? { estado: vigente.estado, fechaFin: vigente.fechaFin, creditos: account?.credits ?? 0 }
      : null,
  });
}
