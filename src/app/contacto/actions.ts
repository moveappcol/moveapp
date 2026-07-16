"use server";

import { sendContactEmail } from "@/lib/email";

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
