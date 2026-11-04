import { NextRequest, NextResponse } from "next/server";

/** Ruta temporal de un solo uso: consulta directo contra Wompi el estado
 * real de una fuente de pago guardada (payment_source), usando la llave
 * privada real de producción (solo vive en Railway) — para diagnosticar
 * por qué un cobro a una fuente ya usada antes falla con
 * "No existe la fuente de pago". Se borra después de usarla. */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "falta ?id=" }, { status: 400 });

  const privateKey = process.env.WOMPI_PRIVATE_KEY;
  if (!privateKey) return NextResponse.json({ error: "falta WOMPI_PRIVATE_KEY" }, { status: 500 });

  const base = privateKey.startsWith("prv_prod_") ? "https://production.wompi.co/v1" : "https://sandbox.wompi.co/v1";
  const res = await fetch(`${base}/payment_sources/${id}`, {
    headers: { Authorization: `Bearer ${privateKey}` },
  });
  const json = await res.json().catch(() => null);

  return NextResponse.json({ base, status: res.status, body: json });
}
