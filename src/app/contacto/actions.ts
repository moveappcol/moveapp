"use server";

import { sendContactEmail, sendGymApplicationEmail } from "@/lib/email";
import { getLocale } from "@/lib/i18n/locale";

const OWNER_EMAIL = "gerencia@uniqueappcol.com";

export type ContactResult = { ok: true } | { ok: false; error: string };

const MESSAGES = {
  es: {
    faltanCampos: "Completa todos los campos.",
    faltanCamposObligatorios: "Completa todos los campos obligatorios.",
    correoInvalido: "Ingresa un correo válido.",
    fallo: (email: string) =>
      `No pudimos enviar tu mensaje. Intenta de nuevo o escríbenos directo a ${email}.`,
    falloSolicitud: (email: string) =>
      `No pudimos enviar tu solicitud. Intenta de nuevo o escríbenos directo a ${email}.`,
  },
  en: {
    faltanCampos: "Fill in all the fields.",
    faltanCamposObligatorios: "Fill in all the required fields.",
    correoInvalido: "Enter a valid email.",
    fallo: (email: string) =>
      `We couldn't send your message. Try again or email us directly at ${email}.`,
    falloSolicitud: (email: string) =>
      `We couldn't send your application. Try again or email us directly at ${email}.`,
  },
};

export async function sendContactMessage(
  _prevState: ContactResult | null,
  formData: FormData
): Promise<ContactResult> {
  const msg = MESSAGES[await getLocale()];
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (!name || !email || !message) {
    return { ok: false, error: msg.faltanCampos };
  }

  try {
    await sendContactEmail({ ownerEmail: OWNER_EMAIL, name, fromEmail: email, message });
    return { ok: true };
  } catch {
    return { ok: false, error: msg.fallo(OWNER_EMAIL) };
  }
}

export async function sendGymApplication(
  _prevState: ContactResult | null,
  formData: FormData
): Promise<ContactResult> {
  const msg = MESSAGES[await getLocale()];
  const nombre = String(formData.get("nombre") ?? "").trim();
  const direccion = String(formData.get("direccion") ?? "").trim();
  const ciudad = String(formData.get("ciudad") ?? "").trim();
  const instagram = String(formData.get("instagram") ?? "").trim();
  const disciplina = String(formData.get("disciplina") ?? "").trim();
  const descripcion = String(formData.get("descripcion") ?? "").trim();
  const correo = String(formData.get("correo") ?? "").trim();

  if (!nombre || !direccion || !ciudad || !disciplina || !descripcion || !correo) {
    return { ok: false, error: msg.faltanCamposObligatorios };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
    return { ok: false, error: msg.correoInvalido };
  }

  try {
    await sendGymApplicationEmail({
      ownerEmail: OWNER_EMAIL,
      nombre,
      direccion,
      ciudad,
      instagram,
      disciplina,
      descripcion,
      correo,
    });
    return { ok: true };
  } catch {
    return { ok: false, error: msg.falloSolicitud(OWNER_EMAIL) };
  }
}
