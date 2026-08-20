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

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function toAttachment(filename: string, content: Buffer): EmailAttachment {
  return { filename, content: content.toString("base64") };
}

function recipients(gymEmail: string | null, ownerEmail: string): string[] {
  return [ownerEmail, ...(gymEmail ? [gymEmail] : [])];
}

function attendeesListHtml(nombres: string[]): string {
  if (nombres.length === 0) return "<p>Sin reservas confirmadas.</p>";
  return `<ul>${nombres.map((n) => `<li>${escapeHtml(n)}</li>`).join("")}</ul>`;
}

/** Correo de las 24h antes: adjunta el PDF "RESERVAS FINALES (24 h antes)".
 * No incluye el total a pagar (ese queda solo en el form de pagos). */
export async function sendLiquidacionEmail(params: {
  gymEmail: string | null;
  ownerEmail: string;
  clase: string;
  fechaLarga: string;
  hora: string;
  asistentes: string[];
  archivo: string;
  pdf: Buffer;
}): Promise<void> {
  const html = `
    <p>Hola,</p>
    <p>Les compartimos las reservas confirmadas para la clase de <strong>${escapeHtml(params.clase)}</strong>, programada para el ${escapeHtml(params.fechaLarga)} a las ${escapeHtml(params.hora)}.</p>
    <p>A continuación encontrarán el listado de personas que, hasta este momento, tienen su reserva confirmada:</p>
    ${attendeesListHtml(params.asistentes)}
    <p>Esta información se envía 24 horas antes del inicio de la clase para facilitar su organización. Si se presentan nuevas reservas o cancelaciones, recibirán una actualización antes del inicio de la clase.</p>
    <p>¡Gracias por ser parte de UNIQUE!</p>
  `;

  await sendEmail({
    to: recipients(params.gymEmail, params.ownerEmail),
    subject: "Reservas confirmadas para la clase en 24 h",
    html,
    attachments: [toAttachment(`pre-reservas-${params.archivo}.pdf`, params.pdf)],
  });
}

/** Correo de los 20 minutos antes: adjunta el PDF "RESERVAS FINALES (20 min
 * antes)" (puede incluir gente que reservó después del corte de las 24h). */
export async function sendReservasFinalesEmail(params: {
  gymEmail: string | null;
  ownerEmail: string;
  clase: string;
  asistentes: string[];
  archivo: string;
  pdf: Buffer;
}): Promise<void> {
  const html = `
    <p>Hola,</p>
    <p>La clase de <strong>${escapeHtml(params.clase)}</strong> comenzará en 20 minutos.</p>
    <p>Les compartimos el listado final de asistentes confirmados:</p>
    ${attendeesListHtml(params.asistentes)}
    <p>Les deseamos una excelente clase y, como siempre, gracias por ser parte de UNIQUE.</p>
  `;

  await sendEmail({
    to: recipients(params.gymEmail, params.ownerEmail),
    subject: "Actualización final de asistentes – Clase próxima a iniciar",
    html,
    attachments: [toAttachment(`reservas-finales-${params.archivo}.pdf`, params.pdf)],
  });
}

/** Correo quincenal (días 1–14 y 15–fin de mes) para cada gimnasio: adjunta
 * el PDF "RESERVAS TOTALES DEL PERIODO" — solo cantidades, sin plata. */
export async function sendReservasTotalesPeriodoEmail(params: {
  gymEmail: string | null;
  ownerEmail: string;
  periodo: string;
  archivo: string;
  pdf: Buffer;
}): Promise<void> {
  const html = `
    <p>Hola,</p>
    <p>Les compartimos el registro de todas las reservas confirmadas en su gimnasio durante el periodo del ${escapeHtml(params.periodo)}.</p>
    <p>El documento adjunto incluye el detalle de cada reserva (nombre, cédula, clase y fecha) y el total por tipo de reserva.</p>
    <p>¡Gracias por ser parte de UNIQUE!</p>
  `;

  await sendEmail({
    to: recipients(params.gymEmail, params.ownerEmail),
    subject: `Registro de reservas del periodo — ${params.periodo}`,
    html,
    attachments: [toAttachment(`reservas-periodo-${params.archivo}.pdf`, params.pdf)],
  });
}

/** Correo quincenal (días 1–14 y 15–fin de mes), solo para el dueño: adjunta
 * el PDF "form pagos" con porcentaje, valor por reserva y total a pagar de
 * cada gimnasio. Nunca se manda a los gimnasios. */
export async function sendFormPagosEmail(params: {
  ownerEmail: string;
  periodo: string;
  pdf: Buffer;
}): Promise<void> {
  const html = `
    <p>Hola,</p>
    <p>Adjunto el detalle de pagos a gimnasios correspondiente al periodo del ${escapeHtml(params.periodo)}, con el porcentaje, el valor por reserva y el total a pagar de cada uno.</p>
    <p>¡Gracias!</p>
  `;

  await sendEmail({
    to: [params.ownerEmail],
    subject: `Form pagos — ${params.periodo}`,
    html,
    attachments: [toAttachment(`form-pagos-${params.periodo}.pdf`, params.pdf)],
  });
}

/** Solicitud de un gimnasio que quiere afiliarse a la plataforma. */
export async function sendGymApplicationEmail(params: {
  ownerEmail: string;
  nombre: string;
  direccion: string;
  ciudad: string;
  instagram: string;
  disciplina: string;
  descripcion: string;
  contacto: string;
}): Promise<void> {
  const html = `
    <p>Nueva solicitud de afiliación de gimnasio:</p>
    <p>
      <strong>Nombre:</strong> ${escapeHtml(params.nombre)}<br/>
      <strong>Dirección:</strong> ${escapeHtml(params.direccion)}<br/>
      <strong>Ciudad:</strong> ${escapeHtml(params.ciudad)}<br/>
      <strong>Instagram:</strong> ${escapeHtml(params.instagram)}<br/>
      <strong>Disciplina:</strong> ${escapeHtml(params.disciplina)}<br/>
      <strong>Contacto:</strong> ${escapeHtml(params.contacto)}
    </p>
    <p><strong>Descripción:</strong><br/>${escapeHtml(params.descripcion).replace(/\n/g, "<br/>")}</p>
  `;

  await sendEmail({
    to: [params.ownerEmail],
    subject: `Nueva solicitud de gimnasio — ${params.nombre}`,
    html,
  });
}

/** Mensaje del formulario de contacto del sitio. */
export async function sendContactEmail(params: {
  ownerEmail: string;
  name: string;
  fromEmail: string;
  message: string;
}): Promise<void> {
  const html = `
    <p>Nuevo mensaje de contacto de <strong>${escapeHtml(params.name)}</strong> (${escapeHtml(params.fromEmail)}):</p>
    <p>${escapeHtml(params.message).replace(/\n/g, "<br/>")}</p>
  `;

  await sendEmail({
    to: [params.ownerEmail],
    subject: `Nuevo mensaje de contacto — ${params.name}`,
    html,
  });
}
