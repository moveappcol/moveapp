import { NextRequest, NextResponse } from "next/server";
import { buildBackupWorkbook } from "@/lib/backup";
import { sendBackupEmail } from "@/lib/email";

const OWNER_EMAIL = "uniqueappcol@gmail.com";

function bogotaFechaHoy(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date());
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const fecha = bogotaFechaHoy();

  try {
    const xlsx = await buildBackupWorkbook();
    await sendBackupEmail({ ownerEmail: OWNER_EMAIL, fecha, xlsx });
    return NextResponse.json({ ok: true, fecha });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 }
    );
  }
}
