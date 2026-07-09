import { formatCOP } from "./credits-pricing";

type EmailAttachment = { filename: string; content: string };

async function sendEmail(params: {
  to: string[];
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("Falta RESEND_API_KEY.");
  const from = process.env.RESEND_FROM_EMAIL || "MOVE <onboarding@resend.dev>";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: params.to,
      subject: params.subject,
      html: params.html,
      attachments: params.attachments,
    }),
  });

  if (!res.ok) {
    const json = await res.json().catch(() => null);
    throw new Error(json?.message ?? `Resend respondió ${res.status}`);
  }
}

export function buildReservationsCsv(rows: { userName: string; estado: string }[]): string {
  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const header = "Nombre,Estado";
  const lines = rows.map((r) => `${escape(r.userName)},${escape(r.estado)}`);
  return [header, ...lines].join("\n");
}

export async function sendLiquidacionEmail(params: {
  gymEmail: string | null;
  ownerEmail: string;
  gimnasio: string;
  clase: string;
  fecha: string;
  reservasConfirmadas: number;
  totalAPagar: number;
  csv: string;
}): Promise<void> {
  const to = [params.ownerEmail, ...(params.gymEmail ? [params.gymEmail] : [])];
  const csvBase64 = Buffer.from(params.csv, "utf-8").toString("base64");

  const html = `
    <p>Liquidación generada para <strong>${params.clase}</strong> en <strong>${params.gimnasio}</strong> (${params.fecha}).</p>
    <p>Reservas confirmadas: ${params.reservasConfirmadas}<br/>
    Total a pagar: ${formatCOP(params.totalAPagar)}</p>
    <p>El detalle de cada reserva va adjunto en CSV.</p>
  `;

  await sendEmail({
    to,
    subject: `Liquidación — ${params.gimnasio} — ${params.clase} (${params.fecha})`,
    html,
    attachments: [
      { filename: `liquidacion-${params.clase}-${params.fecha}.csv`, content: csvBase64 },
    ],
  });
}
