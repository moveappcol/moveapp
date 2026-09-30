import { formatCOP } from "./credits-pricing";

type EmailAttachment = { filename: string; content: string };

// Sin esto, un fetch que Resend deja colgado (así sea rara vez) se queda
// esperando indefinidamente — y como varios crons mandan correos uno por
// uno en un loop, uno solo trabado bloquea a todos los siguientes (incluida
// la copia interna del dueño, que suele mandarse al final). Pasado este
// tiempo, se aborta y se trata como un fallo normal de envío, sin frenar el
// resto.
const RESEND_TIMEOUT_MS = 20_000;

async function sendEmail(params: {
  to: string[];
  bcc?: string[];
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
      bcc: params.bcc,
      subject: params.subject,
      html: params.html,
      attachments: params.attachments,
    }),
    signal: AbortSignal.timeout(RESEND_TIMEOUT_MS),
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

/** El campo "Correo" del gimnasio en Airtable puede traer más de una
 * dirección separadas por coma o punto y coma (ej: "dueño@x.com,
 * encargado@x.com") — Resend exige cada destinatario como un elemento
 * separado de la lista, así que no basta con mandar el texto tal cual. */
function parseGymEmails(gymEmail: string | null): string[] {
  if (!gymEmail) return [];
  return gymEmail
    .split(/[,;]/)
    .map((e) => e.trim())
    .filter(Boolean);
}

/** El gimnasio va en "to"; la copia del dueño va en "bcc" — así el
 * gimnasio nunca ve el correo personal del dueño mezclado en el "Para"
 * (se veía poco profesional y mezclar un Gmail personal con la bandeja
 * del negocio en el mismo "to" también puede leerse como envío masivo).
 * Si el gimnasio no tiene correo registrado, el del dueño pasa a "to"
 * para que el envío no se quede sin ningún destinatario. */
function recipients(gymEmail: string | null, ownerEmail: string): { to: string[]; bcc?: string[] } {
  const gymEmails = parseGymEmails(gymEmail);
  if (gymEmails.length === 0) return { to: [ownerEmail] };
  return { to: gymEmails, bcc: [ownerEmail] };
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
  gimnasio: string | null;
  mapsUrl: string | null;
}): Promise<void> {
  const html = `
    <div style="font-family: sans-serif;">
      <p style="text-align:center;font-size:28px;font-weight:800;color:#063009;margin:0 0 24px;">UNIQUE</p>
      <p style="font-size:18px;font-weight:800;color:#ff4f3f;margin:0 0 20px;">CLASS REMINDER</p>
      <p>¡Hola, ${escapeHtml(params.nombre)}! Esperamos que estés muy bien.</p>
      <p>Te recordamos que tu clase de <strong>${escapeHtml(params.clase)}</strong>${params.gimnasio ? ` en <strong>${escapeHtml(params.gimnasio)}</strong>` : ""} es hoy, <strong>${escapeHtml(params.fechaLarga)}</strong> a las <strong>${escapeHtml(params.hora)}</strong>.</p>
      ${params.mapsUrl ? `<p><a href="${params.mapsUrl}" target="_blank" rel="noopener noreferrer" style="color:#ff4f3f;font-weight:700;">Ver ubicación en Google Maps</a></p>` : ""}
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

/** Alerta operativa genérica al dueño de la plataforma — se usa en los
 * crons críticos (24h antes, 20 min antes, reporte quincenal, recordatorio
 * de clase) para avisar de inmediato si algo no se pudo mandar, en vez de
 * que el fallo quede en silencio hasta que alguien lo note por accidente.
 * Nunca lanza: si la alerta misma falla, no debe tumbar el cron que la
 * disparó — ya bastante daño hace un fallo silencioso, dos no ayudan. */
export async function sendOpsAlertEmail(params: {
  ownerEmail: string;
  asunto: string;
  detalle: string;
}): Promise<void> {
  const html = `
    <div style="font-family: sans-serif;">
      <p style="font-size:18px;font-weight:800;color:#ff4f3f;margin:0 0 20px;">🚨 ALERTA — ${escapeHtml(params.asunto)}</p>
      <pre style="white-space:pre-wrap;font-family:sans-serif;font-size:14px;">${escapeHtml(params.detalle)}</pre>
    </div>
  `;

  try {
    await sendEmail({
      to: [params.ownerEmail],
      subject: `🚨 ALERTA UNIQUE — ${params.asunto}`,
      html,
    });
  } catch {
    // No hay a quién más avisarle si esto falla — se deja constancia en la
    // respuesta JSON del cron (los llamadores igual devuelven el detalle).
  }
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

/** Aviso al dueño de la plataforma cada vez que alguien reserva una clase
 * (reserva directa o promoción automática desde lista de espera) — ver
 * createReservation en reservations.ts. No usa ninguna llamada a Airtable
 * propia: todos los datos ya estaban en memoria en ese punto (el gimnasio ya
 * se había consultado para validar el cupo/cutoff de la reserva). */
export async function sendNewReservationEmail(params: {
  ownerEmail: string;
  userName: string;
  userEmail: string;
  gimnasio: string;
  fechaISO: string;
  creditos: number;
  creditosRestantes: number;
}): Promise<void> {
  const fecha = new Date(params.fechaISO).toLocaleString("es-CO", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "America/Bogota",
  });

  const html = `
    <div style="font-family: sans-serif;">
      <p style="font-size:18px;font-weight:800;color:#063009;margin:0 0 20px;">📅 Nueva reserva</p>
      <p><strong>Usuario:</strong> ${escapeHtml(params.userName)}</p>
      <p><strong>Correo:</strong> ${escapeHtml(params.userEmail)}</p>
      <p><strong>Gimnasio:</strong> ${escapeHtml(params.gimnasio)}</p>
      <p><strong>Clase:</strong> ${escapeHtml(fecha)}</p>
      <p><strong>Créditos cobrados:</strong> ${params.creditos} (le quedan ${params.creditosRestantes})</p>
    </div>
  `;

  try {
    await sendEmail({
      to: [params.ownerEmail],
      subject: `Nueva reserva — ${params.userName} en ${params.gimnasio}`,
      html,
    });
  } catch {
    // Nunca debe tumbar la reserva que ya se hizo — si este aviso falla,
    // simplemente no llega, sin reintentos (ver createReservation).
  }
}

/** Factura electrónica de una compra (plan o créditos) — se manda apenas
 * Dataico confirma la generación (ver facturarCompra en billing.ts). Enlaza
 * al PDF de Dataico en vez de adjuntarlo — ese link ya queda vigente de
 * forma permanente del lado de Dataico. */
export async function sendInvoiceEmail(params: {
  correo: string;
  concepto: string;
  totalConIva: number;
  pdfUrl: string;
}): Promise<void> {
  const html = `
    <div style="font-family: sans-serif;">
      <p style="text-align:center;font-size:28px;font-weight:800;color:#063009;margin:0 0 24px;">UNIQUE</p>
      <p>¡Gracias por tu compra!</p>
      <p><strong>${escapeHtml(params.concepto)}</strong> — ${formatCOP(params.totalConIva)}</p>
      <p>Adjunto va el link a tu factura electrónica:</p>
      <p><a href="${params.pdfUrl}" target="_blank" rel="noopener noreferrer" style="color:#ff4f3f;font-weight:700;">Ver factura electrónica</a></p>
      <p>Equipo UNIQUE</p>
    </div>
  `;

  await sendEmail({
    to: [params.correo],
    subject: "Tu factura electrónica — UNIQUE",
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
    ...recipients(params.gymEmail, params.ownerEmail),
    subject: "Reservas confirmadas para la clase en 24 h",
    html,
    attachments: [toAttachment(`pre-reservas-${params.archivo}.pdf`, params.pdf)],
  });
}

/** Correo de la lista final, justo antes de que empiece la clase (por
 * defecto 20 min, pero cada gimnasio puede tener su propio valor — ver
 * DEFAULT_RESERVAS_FINALES_MINUTES en gyms.ts). El texto del correo no
 * menciona los minutos exactos porque varían según el gimnasio; el PDF
 * adjunto "RESERVAS FINALES (N min antes)" sí trae el valor real de cada
 * uno. Puede incluir gente que reservó después del corte de las 24h. */
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
    <p>La clase de <strong>${escapeHtml(params.clase)}</strong> está por comenzar.</p>
    <p>Les compartimos el listado final de asistentes confirmados:</p>
    ${attendeesListHtml(params.asistentes)}
    <p>Les deseamos una excelente clase y, como siempre, gracias por ser parte de UNIQUE.</p>
  `;

  await sendEmail({
    ...recipients(params.gymEmail, params.ownerEmail),
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
    ...recipients(params.gymEmail, params.ownerEmail),
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

/** Fotos de la caja de regalo (cerrada arriba, abierta abajo con el CTA
 * "adentro") — recortadas y ajustadas de color (rojo -> coral de la marca)
 * a partir de un render 3D que pasó Paula, alojadas en /public/email para
 * que cualquier cliente de correo las pueda cargar desde una URL real. Se
 * usa el dominio de producción siempre (no NEXT_PUBLIC_SITE_URL): quien
 * abre el correo las carga desde SU navegador, nunca desde donde corre el
 * servidor que arma el HTML. */
const EMAIL_ASSETS_BASE = "https://www.uniqueappcol.com/email";

/** Plantilla compartida de las dos variantes del correo de regalo (al
 * comprador y a quien lo recibe) — mismo formato de "tarjeta de regalo
 * festiva", solo cambian el saludo y el botón. Tabla + estilos inline a
 * propósito (nada de flexbox/grid ni CSS externo): es lo único que los
 * clientes de correo (Gmail, Outlook, Apple Mail) renderizan de forma
 * confiable. El botón se monta sobre la caja abierta con `position:relative`
 * + `top` negativo (un margen negativo directo en la tabla del botón le
 * rompía el fondo coral — el navegador dejaba de pintarlo) — funciona en
 * Gmail/Apple Mail; en clientes que ignoran position (Outlook de
 * escritorio) el botón simplemente cae justo debajo de la caja. */
function giftEmailHtml(params: {
  saludo: string;
  codigo: string;
  planLabel: string;
  fechaLimiteLabel: string;
  ctaLabel: string;
  ctaUrl: string;
  nota: string;
}): string {
  return `
    <div style="background:#063009;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
      <table role="presentation" width="100%" style="max-width:520px;margin:0 auto;border-collapse:collapse;">
        <tr>
          <td style="padding:8px 24px 0;text-align:center;">
            <p style="margin:0;font-size:12px;font-weight:800;letter-spacing:5px;text-transform:uppercase;color:#ffffff;opacity:0.55;">Un regalo para ti</p>
            <img src="${EMAIL_ASSETS_BASE}/gift-box-closed.png" width="200" alt="" style="display:block;margin:18px auto 4px;width:200px;max-width:60%;height:auto;" />
            <p style="margin:16px 0 0;font-size:20px;font-weight:800;line-height:1.4;color:#ffffff;">${escapeHtml(params.saludo)} 🎁</p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 24px 0;text-align:center;">
            <p style="margin:0;font-size:11px;font-weight:800;letter-spacing:4px;text-transform:uppercase;color:#ff4f3f;">Tu código</p>
            <p style="margin:10px 0 0;font-size:36px;font-weight:800;letter-spacing:6px;color:#ffffff;">${escapeHtml(params.codigo)}</p>
            <p style="margin:10px 0 0;font-size:14px;color:#ffffff;opacity:0.6;">Plan ${escapeHtml(params.planLabel)}</p>
            <p style="margin:18px 0 0;font-size:14px;line-height:1.6;color:#ffffff;opacity:0.85;">
              Válido hasta el <strong>${escapeHtml(params.fechaLimiteLabel)}</strong>
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:12px 0 0;text-align:center;">
            <img src="${EMAIL_ASSETS_BASE}/gift-box-open.png" width="440" alt="" style="display:block;margin:0 auto;width:440px;max-width:90%;height:auto;" />
          </td>
        </tr>
        <tr>
          <td style="padding:0 24px;text-align:center;">
            <table role="presentation" style="position:relative;top:-56px;margin:0 auto;border-collapse:collapse;">
              <tr>
                <td style="border-radius:999px;background:#ff4f3f;">
                  <a href="${params.ctaUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 36px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:999px;">
                    ${escapeHtml(params.ctaLabel)}
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:4px 32px 4px;text-align:center;">
            <p style="margin:0;font-size:13px;line-height:1.6;color:#ffffff;opacity:0.6;">
              ${escapeHtml(params.nota)}
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px 8px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#ffffff;opacity:0.35;">UNIQUE — Bogotá</p>
          </td>
        </tr>
      </table>
    </div>
  `;
}

/** Va al comprador justo después de pagar un regalo — el código y el link
 * para verlo/imprimirlo o reenviarlo a quien se lo va a regalar (ver
 * /regalar/voucher/[codigo]). No lleva créditos todavía: esos solo se dan
 * cuando alguien canjea el código en /canjear. */
export async function sendGiftPurchaseEmail(params: {
  compradorEmail: string;
  compradorNombre: string;
  planLabel: string;
  codigo: string;
  fechaLimiteLabel: string;
  voucherUrl: string;
}): Promise<void> {
  const html = giftEmailHtml({
    saludo: `¡Hola ${params.compradorNombre}! Gracias por regalar un plan UNIQUE`,
    codigo: params.codigo,
    planLabel: params.planLabel,
    fechaLimiteLabel: params.fechaLimiteLabel,
    ctaLabel: "Ver mi regalo",
    ctaUrl: params.voucherUrl,
    nota: "Desde ahí puedes imprimirlo o mandárselo directo por correo a quien se lo vas a regalar.",
  });

  await sendEmail({
    to: [params.compradorEmail],
    subject: "Tu regalo UNIQUE está listo 🎁",
    html,
  });
}

/** Va directo a la persona que recibe el regalo (cuando el comprador usa el
 * formulario "Enviar a un amigo" en /regalar/voucher/[codigo]) — mismo
 * código, pero con el mensaje enfocado en cómo activarlo, no en la compra. */
export async function sendGiftCodeToRecipientEmail(params: {
  destinatarioEmail: string;
  compradorNombre: string;
  planLabel: string;
  codigo: string;
  fechaLimiteLabel: string;
  canjearUrl: string;
}): Promise<void> {
  const html = giftEmailHtml({
    saludo: `¡${params.compradorNombre} te regaló un plan UNIQUE!`,
    codigo: params.codigo,
    planLabel: params.planLabel,
    fechaLimiteLabel: params.fechaLimiteLabel,
    ctaLabel: "Activar mi regalo",
    ctaUrl: params.canjearUrl,
    nota: "Actívalo con el correo donde quieras recibir tus créditos.",
  });

  await sendEmail({
    to: [params.destinatarioEmail],
    subject: `${params.compradorNombre} te regaló un plan UNIQUE 🎁`,
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
