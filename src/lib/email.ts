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
  const from = process.env.RESEND_FROM_EMAIL || "UNIQUE <onboarding@resend.dev>";

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

function toAttachment(filename: string, rtf: string): EmailAttachment {
  return { filename, content: Buffer.from(rtf, "utf-8").toString("base64") };
}

function recipients(gymEmail: string | null, ownerEmail: string): string[] {
  return [ownerEmail, ...(gymEmail ? [gymEmail] : [])];
}

/** Correo de las 24h antes: incluye el resumen financiero para el dueño y
 * adjunta la plantilla "Pre reservas 24h antes" ya llena. */
export async function sendLiquidacionEmail(params: {
  gymEmail: string | null;
  ownerEmail: string;
  gimnasio: string;
  clase: string;
  fecha: string;
  reservasConfirmadas: number;
  totalAPagar: number;
  rtf: string;
}): Promise<void> {
  const html = `
    <p>Liquidación generada para <strong>${params.clase}</strong> en <strong>${params.gimnasio}</strong> (${params.fecha}).</p>
    <p>Reservas confirmadas: ${params.reservasConfirmadas}<br/>
    Total a pagar: ${formatCOP(params.totalAPagar)}</p>
    <p>El documento de pre-reservas va adjunto.</p>
  `;

  await sendEmail({
    to: recipients(params.gymEmail, params.ownerEmail),
    subject: `Pre reservas 24h antes — ${params.gimnasio} — ${params.clase} (${params.fecha})`,
    html,
    attachments: [toAttachment(`pre-reservas-${params.clase}-${params.fecha}.rtf`, params.rtf)],
  });
}

/** Correo de los 15 minutos antes: solo la lista final (puede incluir gente
 * que reservó después del corte de las 24h). */
export async function sendReservasFinalesEmail(params: {
  gymEmail: string | null;
  ownerEmail: string;
  gimnasio: string;
  clase: string;
  fecha: string;
  rtf: string;
}): Promise<void> {
  const html = `
    <p>Lista final de reservas para <strong>${params.clase}</strong> en <strong>${params.gimnasio}</strong> (${params.fecha}).</p>
    <p>El documento va adjunto.</p>
  `;

  await sendEmail({
    to: recipients(params.gymEmail, params.ownerEmail),
    subject: `Reservas finales — ${params.gimnasio} — ${params.clase} (${params.fecha})`,
    html,
    attachments: [toAttachment(`reservas-finales-${params.clase}-${params.fecha}.rtf`, params.rtf)],
  });
}
