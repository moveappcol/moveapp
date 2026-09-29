"use server";

import { redirect } from "next/navigation";
import {
  buildIntegritySignature,
  wompiPublicKey,
  WOMPI_CHECKOUT_URL,
} from "@/lib/wompi";
import { buildReference, findCatalogItem } from "@/lib/orders";
import { createPendingPago } from "@/lib/pagos";
import { sendGiftCodeToRecipientEmail } from "@/lib/email";
import { findRegaloByCodigo } from "@/lib/regalos";

/** A propósito SIN auth() — comprar un regalo no requiere cuenta ni sesión,
 * el nombre y correo vienen directo del formulario (ver /regalar/[planId]).
 * `planId` va pre-atado con .bind() en el <form action>, así que solo
 * recibe FormData como argumento real, igual que bookClass en gimnasios. */
export async function startGiftCheckout(planId: string, formData: FormData): Promise<void> {
  const item = findCatalogItem("regalo", planId);
  if (!item) redirect("/#planes");

  const nombreLimpio = String(formData.get("nombre") ?? "").trim();
  const correoLimpio = String(formData.get("correo") ?? "").trim().toLowerCase();
  if (!nombreLimpio || !correoLimpio.includes("@")) {
    redirect(`/regalar/${planId}?error=datos`);
  }

  const reference = buildReference("regalo", planId, "guest");
  const amountInCents = item.price * 100;
  const signature = buildIntegritySignature(reference, amountInCents, "COP");

  await createPendingPago({
    referencia: reference,
    correo: correoLimpio,
    nombre: nombreLimpio,
    tipo: "regalo",
    item: planId,
    creditos: item.credits,
    valor: item.price,
  });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const params = new URLSearchParams({
    "public-key": wompiPublicKey(),
    currency: "COP",
    "amount-in-cents": String(amountInCents),
    reference,
    "signature:integrity": signature,
    "redirect-url": `${siteUrl}/regalar/resultado`,
    "customer-data:email": correoLimpio,
    "customer-data:full-name": nombreLimpio,
  });

  redirect(`${WOMPI_CHECKOUT_URL}?${params.toString()}`);
}

export type EnviarRegaloResult = { ok: true } | { ok: false; error: string };

/** Desde /regalar/voucher/[codigo] — el comprador le manda el código
 * directo a quien se lo va a regalar, por si no quiere imprimirlo. No
 * canjea nada todavía, solo reenvía el mismo correo que ya recibió el
 * comprador, pero dirigido a otra persona. */
export async function enviarRegaloADestinatario(
  codigo: string,
  destinatarioCorreo: string
): Promise<EnviarRegaloResult> {
  const regalo = await findRegaloByCodigo(codigo);
  if (!regalo) return { ok: false, error: "No encontramos ese código de regalo." };
  if (regalo.estado === "Activado") {
    return { ok: false, error: "Este código ya fue canjeado." };
  }

  const correo = destinatarioCorreo.trim().toLowerCase();
  if (!correo.includes("@")) return { ok: false, error: "Ingresa un correo válido." };

  const plan = findCatalogItem("regalo", regalo.planId);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  try {
    await sendGiftCodeToRecipientEmail({
      destinatarioEmail: correo,
      compradorNombre: regalo.compradoPorNombre || "Alguien especial",
      planLabel: plan?.name ?? plan?.label ?? regalo.planId,
      codigo: regalo.codigo,
      fechaLimiteLabel: new Date(regalo.fechaLimite).toLocaleDateString("es-CO", {
        timeZone: "America/Bogota",
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
      canjearUrl: `${siteUrl}/canjear?codigo=${regalo.codigo}`,
    });
    return { ok: true };
  } catch {
    return { ok: false, error: "No pudimos enviar el correo — inténtalo de nuevo en un momento." };
  }
}
