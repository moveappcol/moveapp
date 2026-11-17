"use server";

import { redirect } from "next/navigation";
import {
  buildIntegritySignature,
  wompiPublicKey,
  WOMPI_CHECKOUT_URL,
} from "@/lib/wompi";
import { buildReference, buildRegaloItemId, findCatalogItem } from "@/lib/orders";
import { createPendingPago } from "@/lib/pagos";
import { sendGiftCodeToRecipientEmail } from "@/lib/email";
import {
  findRegaloByCodigo,
  fechaLargaRegalo,
  prepararRegalo,
  validarDatosTarjetaRegalo,
  type DatosTarjetaRegalo,
} from "@/lib/regalos";

/** A propósito SIN auth() — comprar un regalo no requiere cuenta ni sesión,
 * el nombre y correo vienen directo del formulario (ver GiftForm). El plan,
 * los meses y si es física viajan en el itemId (buildRegaloItemId), así el
 * webhook reconstruye el precio solo desde la referencia; lo que va escrito
 * en la tarjeta y el envío quedan guardados en "Regalosnavidad" antes de pagar
 * (prepararRegalo), porque el webhook no recibe nada del formulario. */
export async function startGiftCheckout(formData: FormData): Promise<void> {
  const planId = String(formData.get("planId") ?? "");
  const meses = Number(formData.get("meses") ?? 1);
  const fisica = formData.get("tipo") === "fisica";
  const itemId = buildRegaloItemId({ planId, meses, fisica });
  const item = findCatalogItem("regalo", itemId);
  if (!item) redirect("/regalar");

  const volver = (error: string) => redirect(`/regalar/${planId}?error=${encodeURIComponent(error)}`);

  const nombreLimpio = String(formData.get("nombre") ?? "").trim();
  const correoLimpio = String(formData.get("correo") ?? "").trim().toLowerCase();
  if (!nombreLimpio || !correoLimpio.includes("@")) volver("Revisa tu nombre y correo antes de continuar.");

  const validados = validarDatosTarjetaRegalo(
    {
      para: formData.get("para"),
      deParte: formData.get("deParte"),
      ciudad: formData.get("ciudad"),
      direccion: formData.get("direccion"),
      celular: formData.get("celular"),
    },
    fisica
  );
  if (!validados.ok) volver(validados.error);
  const datos = (validados as { ok: true; datos: DatosTarjetaRegalo }).datos;

  const reference = buildReference("regalo", itemId, "guest");
  const amountInCents = item!.price * 100;
  const signature = buildIntegritySignature(reference, amountInCents, "COP");

  const pagoId = await createPendingPago({
    referencia: reference,
    correo: correoLimpio,
    nombre: nombreLimpio,
    tipo: "regalo",
    item: itemId,
    creditos: item!.credits,
    valor: item!.price,
  });
  await prepararRegalo({
    itemId,
    compradoPorCorreo: correoLimpio,
    compradoPorNombre: nombreLimpio,
    pagoId,
    datos,
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
      compradorNombre: regalo.deParte || regalo.compradoPorNombre || "Alguien especial",
      planLabel: `${plan?.name ?? regalo.planId} · ${regalo.meses === 1 ? "1 mes" : `${regalo.meses} meses`}`,
      codigo: regalo.codigo,
      fechaCompraLabel: fechaLargaRegalo(regalo.fechaCompra),
      fechaLimiteLabel: fechaLargaRegalo(regalo.fechaLimite),
      canjearUrl: `${siteUrl}/canjear?codigo=${regalo.codigo}`,
    });
    return { ok: true };
  } catch {
    return { ok: false, error: "No pudimos enviar el correo — inténtalo de nuevo en un momento." };
  }
}
