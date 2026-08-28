"use server";

import { sendContactEmail, sendGymApplicationEmail } from "@/lib/email";

const OWNER_EMAIL = "uniqueappcol@gmail.com";

export type ContactResult = { ok: true } | { ok: false; error: string };

export async function sendContactMessage(
  _prevState: ContactResult | null,
  formData: FormData
): Promise<ContactResult> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (!name || !email || !message) {
    return { ok: false, error: "Completa todos los campos." };
  }

  try {
    await sendContactEmail({ ownerEmail: OWNER_EMAIL, name, fromEmail: email, message });
    return { ok: true };
  } catch {
    return { ok: false, error: "No pudimos enviar tu mensaje. Intenta de nuevo o escríbenos directo a " + OWNER_EMAIL + "." };
  }
}

export async function sendGymApplication(
  _prevState: ContactResult | null,
  formData: FormData
): Promise<ContactResult> {
  const nombre = String(formData.get("nombre") ?? "").trim();
  const direccion = String(formData.get("direccion") ?? "").trim();
  const ciudad = String(formData.get("ciudad") ?? "").trim();
  const instagram = String(formData.get("instagram") ?? "").trim();
  const disciplina = String(formData.get("disciplina") ?? "").trim();
  const descripcion = String(formData.get("descripcion") ?? "").trim();
  const correo = String(formData.get("correo") ?? "").trim();

  if (!nombre || !direccion || !ciudad || !disciplina || !descripcion || !correo) {
    return { ok: false, error: "Completa todos los campos obligatorios." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
    return { ok: false, error: "Ingresa un correo válido." };
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
    return { ok: false, error: "No pudimos enviar tu solicitud. Intenta de nuevo o escríbenos directo a " + OWNER_EMAIL + "." };
  }
}
