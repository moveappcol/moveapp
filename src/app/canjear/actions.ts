"use server";

import { canjearRegalo, type CanjearRegaloResult } from "@/lib/regalos";

export async function canjearRegaloAction(
  _prev: CanjearRegaloResult | null,
  formData: FormData
): Promise<CanjearRegaloResult> {
  const codigo = String(formData.get("codigo") ?? "").trim();
  const correo = String(formData.get("correo") ?? "").trim().toLowerCase();

  if (!codigo) return { ok: false, error: "Ingresa el código de tu regalo." };
  if (!correo.includes("@")) return { ok: false, error: "Ingresa un correo válido." };

  return canjearRegalo(codigo, correo);
}
