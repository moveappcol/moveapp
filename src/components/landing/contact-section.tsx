"use client";

import { useState } from "react";
import ContactForm from "./contact-form";
import GymApplicationForm from "./gym-application-form";

const CONTACT_EMAIL = "uniqueappcol@gmail.com";

type Tab = "cliente" | "gimnasio";

export default function ContactSection() {
  const [tab, setTab] = useState<Tab>("cliente");

  return (
    <section id="contacto" className="bg-background">
      <div className="mx-auto max-w-2xl px-4 py-20 sm:px-6">
        <h2 className="font-heading text-3xl font-bold text-move-green">Contacto</h2>
        <p className="mt-2 font-body text-move-green/70">
          ¿Dudas, alianzas o soporte? Escríbenos y te contestamos pronto, o
          mándanos un correo directo a{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-move-coral underline-offset-4 hover:underline">
            {CONTACT_EMAIL}
          </a>
          .
        </p>

        <div className="mt-8 flex gap-2">
          <button
            type="button"
            onClick={() => setTab("cliente")}
            className={`rounded-full border px-4 py-2 font-heading text-sm font-medium transition-colors ${
              tab === "cliente"
                ? "border-move-coral bg-move-coral text-white"
                : "border-move-green/15 text-move-green/60 hover:border-move-green/40"
            }`}
          >
            Tengo una pregunta
          </button>
          <button
            type="button"
            onClick={() => setTab("gimnasio")}
            className={`rounded-full border px-4 py-2 font-heading text-sm font-medium transition-colors ${
              tab === "gimnasio"
                ? "border-move-coral bg-move-coral text-white"
                : "border-move-green/15 text-move-green/60 hover:border-move-green/40"
            }`}
          >
            Quiero afiliar mi gimnasio
          </button>
        </div>

        <div className="mt-6">{tab === "cliente" ? <ContactForm /> : <GymApplicationForm />}</div>
      </div>
    </section>
  );
}
