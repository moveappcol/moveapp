import { NextRequest, NextResponse } from "next/server";
import { createElectronicInvoice } from "@/lib/dataico";
import { updatePagoFactura } from "@/lib/pagos";
import { sendInvoiceEmail } from "@/lib/email";

/** Ruta temporal de un solo uso: reintenta createElectronicInvoice para un
 * Pago que ya tiene "Factura Numero" reservado pero nunca generó PDF/CUFE,
 * sin reservar un número nuevo. Completa el mismo flujo que facturarCompra
 * (guarda PDF+CUFE, manda el correo) si Dataico acepta esta vez. Se borra
 * después de usarla. */
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { pagoId, numero, sku, concepto, totalConIva, correo, nombre, apellido, tipoDocumento, cedula, telefono } =
    body;

  const result = await createElectronicInvoice({
    numero,
    sku,
    concepto,
    totalConIva,
    correo,
    nombre,
    apellido,
    tipoDocumento,
    cedula,
    telefono,
  });

  if (result.ok) {
    await updatePagoFactura(pagoId, { pdfUrl: result.pdfUrl, cufe: result.cufe });
    await sendInvoiceEmail({ correo, concepto, totalConIva, pdfUrl: result.pdfUrl });
  }

  return NextResponse.json(result);
}
