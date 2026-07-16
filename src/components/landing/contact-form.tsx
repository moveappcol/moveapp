"use client";

import { useActionState } from "react";
import { sendContactMessage, type ContactResult } from "@/app/contacto/actions";

export default function ContactForm() {
  const [state, formAction, isPending] = useActionState<ContactResult | null, FormData>(
    sendContactMessage,
    null
  );

  if (state?.ok) {
    return (
      <p className="rounded-2xl border border-move-green/10 bg-white p-6 font-body text-sm font-medium text-move-green">
        ¡Gracias! Recibimos tu mensaje y te contestamos pronto.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-4 rounded-2xl border border-move-green/10 bg-white p-6">
      <label className="block">
        <span className="font-heading text-sm font-medium text-move-green">Nombre</span>
        <input
          type="text"
          name="name"
          required
          className="mt-2 w-full rounded-xl border border-move-green/20 px-4 py-3 font-body text-move-green outline-none focus:border-move-coral"
        />
      </label>

      <label className="block">
        <span className="font-heading text-sm font-medium text-move-green">Correo</span>
        <input
          type="email"
          name="email"
          required
          className="mt-2 w-full rounded-xl border border-move-green/20 px-4 py-3 font-body text-move-green outline-none focus:border-move-coral"
        />
      </label>

      <label className="block">
        <span className="font-heading text-sm font-medium text-move-green">Mensaje</span>
        <textarea
          name="message"
          required
          rows={4}
          className="mt-2 w-full rounded-xl border border-move-green/20 px-4 py-3 font-body text-move-green outline-none focus:border-move-coral"
        />
      </label>

      {state && !state.ok && <p className="font-body text-sm text-move-coral">{state.error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-full bg-move-coral px-6 py-3 font-heading text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? "Enviando…" : "Enviar mensaje"}
      </button>
    </form>
  );
}
