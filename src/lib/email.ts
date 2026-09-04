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

/** Recordatorio de clase, 3 horas antes — va directo a la persona que
 * reservó (no al gimnasio ni al dueño), con el mismo diseño de la
 * plantilla "CLASS REMINDER". */
export async function sendClassReminderEmail(params: {
  userEmail: string;
  nombre: string;
  clase: string;
  fechaLarga: string;
  hora: string;
}): Promise<void> {
  const html = `
    <div style="font-family: sans-serif;">
      <p style="text-align:center;font-size:28px;font-weight:800;color:#063009;margin:0 0 24px;">UNIQUE</p>
      <p style="font-size:18px;font-weight:800;color:#ff4f3f;margin:0 0 20px;">CLASS REMINDER</p>
      <p>¡Hola, ${escapeHtml(params.nombre)}! Esperamos que estés muy bien.</p>
      <p>Te recordamos que tu clase de <strong>${escapeHtml(params.clase)}</strong> es hoy, <strong>${escapeHtml(params.fechaLarga)}</strong> a las <strong>${escapeHtml(params.hora)}</strong>.</p>
      <p>Te esperamos para que disfrutes mucho la clase y tengas un espacio para moverte, desconectarte y disfrutar.</p>
      <p>Equipo UNIQUE</p>
    </div>
  `;

  await sendEmail({
    to: [params.userEmail],
    subject: "Class reminder — tu clase es en 3 horas",
    html,
  });
}

/** Correo "AFTER CLASS" — se manda a la persona apenas termina su clase,
 * invitándola (sin obligar) a calificarla desde "Mis reservas". */
export async function sendAfterClassEmail(params: { userEmail: string }): Promise<void> {
  const html = `
    <div style="font-family: sans-serif;">
      <p style="text-align:center;font-size:28px;font-weight:800;color:#063009;margin:0 0 24px;">UNIQUE</p>
      <p style="font-size:18px;font-weight:800;color:#ff4f3f;margin:0 0 20px;">AFTER CLASS</p>
      <p>¡Esperamos que hayas disfrutado mucho de tu entrenamiento!</p>
      <p>Nos encanta que seas parte de <strong>UNIQUE</strong> y que estés disfrutando de esta experiencia con nosotros.</p>
      <p>Si quieres calificar tu experiencia y dejarnos algún comentario, puedes hacerlo fácilmente desde <strong>TUS RESERVAS</strong> en nuestra página web.</p>
      <p>¡Gracias por ser parte de UNIQUE!</p>
    </div>
  `;

  await sendEmail({
    to: [params.userEmail],
    subject: "¿Cómo estuvo tu clase?",
    html,
  });
}

export type AnalisisGymRow = {
  gimnasio: string;
  clases: number;
  reservas: number;
  cupos: number;
  ocupacion: number;
};

export type AnalisisClaseRow = {
  gimnasio: string;
  clase: string;
  horario: string;
  reservas: number;
  cupos: number;
  ocupacion: number;
};

/** Análisis semanal de reservas por gimnasio — ranking, horarios con poca
 * demanda y clases casi llenas que podrían necesitar más cupos. Solo para
 * el dueño de la plataforma. */
export async function sendWeeklyAnalysisEmail(params: {
  ownerEmail: string;
  periodo: string;
  porGimnasio: AnalisisGymRow[];
  pocaDemanda: AnalisisClaseRow[];
  necesitanCupos: AnalisisClaseRow[];
}): Promise<void> {
  const pct = (n: number) => `${Math.round(n * 100)}%`;

  const gymRows = params.porGimnasio
    .map(
      (g) =>
        `<tr><td style="padding:6px 10px;border:1px solid #ddd;">${escapeHtml(g.gimnasio)}</td><td style="padding:6px 10px;border:1px solid #ddd;text-align:center;">${g.clases}</td><td style="padding:6px 10px;border:1px solid #ddd;text-align:center;">${g.reservas}/${g.cupos}</td><td style="padding:6px 10px;border:1px solid #ddd;text-align:center;">${pct(g.ocupacion)}</td></tr>`
    )
    .join("");

  const claseRow = (c: AnalisisClaseRow) =>
    `<tr><td style="padding:6px 10px;border:1px solid #ddd;">${escapeHtml(c.gimnasio)}</td><td style="padding:6px 10px;border:1px solid #ddd;">${escapeHtml(c.clase)}</td><td style="padding:6px 10px;border:1px solid #ddd;">${escapeHtml(c.horario)}</td><td style="padding:6px 10px;border:1px solid #ddd;text-align:center;">${c.reservas}/${c.cupos}</td><td style="padding:6px 10px;border:1px solid #ddd;text-align:center;">${pct(c.ocupacion)}</td></tr>`;

  const tableHeader = (cols: string[]) =>
    `<tr>${cols.map((c) => `<th style="padding:6px 10px;border:1px solid #ddd;background:#063009;color:#fff;">${c}</th>`).join("")}</tr>`;

  const html = `
    <div style="font-family: sans-serif; color:#111;">
      <p style="font-size:18px;font-weight:800;color:#063009;margin:0 0 4px;">Análisis semanal de reservas</p>
      <p style="margin:0 0 20px;color:#555;">Periodo: ${escapeHtml(params.periodo)}</p>

      <p style="font-weight:700;margin:20px 0 8px;">Gimnasios con más reservas</p>
      <table style="border-collapse:collapse;width:100%;font-size:13px;">
        ${tableHeader(["Gimnasio", "Clases", "Reservas/Cupos", "Ocupación"])}
        ${gymRows || `<tr><td colspan="4" style="padding:8px;">Sin datos esta semana.</td></tr>`}
      </table>

      <p style="font-weight:700;margin:24px 0 8px;">Horarios que casi no se mueven (≤30% de ocupación)</p>
      <table style="border-collapse:collapse;width:100%;font-size:13px;">
        ${tableHeader(["Gimnasio", "Clase", "Horario", "Reservas/Cupos", "Ocupación"])}
        ${params.pocaDemanda.map(claseRow).join("") || `<tr><td colspan="5" style="padding:8px;">Ninguno esta semana.</td></tr>`}
      </table>

      <p style="font-weight:700;margin:24px 0 8px;">Gimnasios/horarios que podrían necesitar más cupos (≥90% de ocupación)</p>
      <table style="border-collapse:collapse;width:100%;font-size:13px;">
        ${tableHeader(["Gimnasio", "Clase", "Horario", "Reservas/Cupos", "Ocupación"])}
        ${params.necesitanCupos.map(claseRow).join("") || `<tr><td colspan="5" style="padding:8px;">Ninguno esta semana.</td></tr>`}
      </table>
    </div>
  `;

  await sendEmail({
    to: [params.ownerEmail],
    subject: `Análisis semanal de reservas — ${params.periodo}`,
    html,
  });
}

/** Backup diario de seguridad: todas las tablas de Airtable en un solo
 * Excel adjunto, solo para el dueño de la plataforma. */
export async function sendBackupEmail(params: {
  ownerEmail: string;
  fecha: string;
  xlsx: Buffer;
}): Promise<void> {
  const html = `
    <div style="font-family: sans-serif;">
      <p style="font-size:18px;font-weight:800;color:#063009;margin:0 0 20px;">Backup diario — ${escapeHtml(params.fecha)}</p>
      <p>Adjunto va el respaldo completo de toda la información de Airtable de este día.</p>
    </div>
  `;

  await sendEmail({
    to: [params.ownerEmail],
    subject: `Backup - ${params.fecha}`,
    html,
    attachments: [toAttachment(`backup-${params.fecha}.xlsx`, params.xlsx)],
  });
}

/** Alerta interna cuando alguien califica una clase con 3 estrellas o
 * menos — se manda solo al dueño de la plataforma, nunca al gimnasio ni
 * al usuario. */
export async function sendLowRatingAlertEmail(params: {
  ownerEmail: string;
  gimnasio: string;
  clase: string;
  userName: string;
  userEmail: string;
  userTelefono: string | null;
  calificacion: number;
  comentario: string;
}): Promise<void> {
  const html = `
    <div style="font-family: sans-serif;">
      <p style="font-size:18px;font-weight:800;color:#ff4f3f;margin:0 0 20px;">⚠️ URGENTE — CALIFICACIÓN BAJA</p>
      <p><strong>Gimnasio:</strong> ${escapeHtml(params.gimnasio)}</p>
      <p><strong>Clase:</strong> ${escapeHtml(params.clase)}</p>
      <p><strong>Usuario:</strong> ${escapeHtml(params.userName)}</p>
      <p><strong>Correo:</strong> ${escapeHtml(params.userEmail)}</p>
      <p><strong>Teléfono:</strong> ${params.userTelefono ? escapeHtml(params.userTelefono) : "(sin registrar)"}</p>
      <p><strong>Calificación:</strong> ${"★".repeat(params.calificacion)}${"☆".repeat(5 - params.calificacion)} (${params.calificacion}/5)</p>
      <p><strong>Comentario:</strong> ${params.comentario ? escapeHtml(params.comentario) : "(sin comentario)"}</p>
    </div>
  `;

  await sendEmail({
    to: [params.ownerEmail],
    subject: `URGENTE CALIFICACIÓN — ${params.calificacion}★ en ${params.clase}`,
    html,
  });
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
    <p>Esta información se envía 24 horas antes del inicio de la clase para facilitar su organización.</p>
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
  correo: string;
}): Promise<void> {
  const html = `
    <p>Nueva solicitud de afiliación de gimnasio:</p>
    <p>
      <strong>Nombre:</strong> ${escapeHtml(params.nombre)}<br/>
      <strong>Dirección:</strong> ${escapeHtml(params.direccion)}<br/>
      <strong>Ciudad:</strong> ${escapeHtml(params.ciudad)}<br/>
      <strong>Instagram:</strong> ${escapeHtml(params.instagram)}<br/>
      <strong>Disciplina:</strong> ${escapeHtml(params.disciplina)}<br/>
      <strong>Correo:</strong> ${escapeHtml(params.correo)}
    </p>
    <p><strong>Descripción:</strong><br/>${escapeHtml(params.descripcion).replace(/\n/g, "<br/>")}</p>
  `;

  await sendEmail({
    to: [params.ownerEmail],
    subject: `Nueva solicitud de gimnasio — ${params.nombre}`,
    html,
  });
}

/** Reporte del agente diario que revisa la salud de la web, la app y las
 * integraciones (Airtable, Clerk, Wompi, los cron jobs). `requiereAtencion`
 * resalta el asunto cuando el hallazgo es algo que el agente no debía
 * arreglar solo (ej. cualquier cosa de pagos o suscripciones). */
export async function sendAgentReportEmail(params: {
  ownerEmail: string;
  cuerpo: string;
  requiereAtencion: boolean;
}): Promise<void> {
  const html = `
    <div style="font-family: sans-serif; white-space: pre-wrap; line-height: 1.5;">
      ${escapeHtml(params.cuerpo)}
    </div>
  `;

  await sendEmail({
    to: [params.ownerEmail],
    subject: params.requiereAtencion
      ? "🚨 Agente diario — necesita tu atención"
      : "Agente diario — reporte de salud",
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
