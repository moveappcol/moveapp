import { NextRequest, NextResponse } from "next/server";
import { getAirtableBase } from "@/lib/airtable";
import { findCatalogItem } from "@/lib/orders";
import { facturarCompra } from "@/lib/billing";

/** Endpoint temporal de un solo uso — reintenta facturar (Dataico) un pago
 * ya aprobado que se quedó sin factura (ej. porque Dataico falló en el
 * momento del webhook). Corre con las variables de entorno reales del
 * servicio, a diferencia de una consola/shell manual, que no las tiene.
 * Protegido con CRON_SECRET igual que los crons. Se borra apenas se use. */
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const pagoId = body?.pagoId as string | undefined;
  if (!pagoId) return NextResponse.json({ error: "Falta pagoId." }, { status: 400 });

  const base = getAirtableBase();
  let record;
  try {
    record = await base("Pagos").find(pagoId);
  } catch {
    return NextResponse.json({ error: "Pago no encontrado." }, { status: 404 });
  }

  const correo = (record.get("Correo") as string) ?? "";
  const tipo = (record.get("Tipo") as string) ?? "";
  const itemId = (record.get("item") as string) ?? "";
  const valor = (record.get("Valor") as number) ?? null;
  const facturaPdfUrl = record.get("Factura PDF") as string | undefined;

  if (facturaPdfUrl) {
    return NextResponse.json({ ok: true, skipped: "ya tiene factura", facturaPdfUrl });
  }

  const kind = tipo === "Plan" ? "plan" : "topup";
  const item = findCatalogItem(kind, itemId);
  if (!item) return NextResponse.json({ error: `Item de catálogo no encontrado: ${itemId}` }, { status: 400 });

  const totalConIva = valor ?? item.price;

  await facturarCompra({
    correo,
    sku: item.id,
    concepto:
      tipo === "Plan"
        ? `Suscripción UNIQUE — Plan ${item.name ?? item.label}`
        : `Créditos adicionales UNIQUE — ${item.label}`,
    totalConIva,
    pagoId,
  });

  // facturarCompra nunca lanza y no devuelve resultado — se relee el
  // registro para saber si de verdad quedó facturado esta vez.
  const after = await base("Pagos").find(pagoId);
  const pdfUrl = after.get("Factura PDF") as string | undefined;

  return NextResponse.json({ ok: Boolean(pdfUrl), facturaPdfUrl: pdfUrl ?? null });
}
