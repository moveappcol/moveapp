import ContactForm from "./contact-form";

const CONTACT_EMAIL = "uniqueappcol@gmail.com";

export default function ContactSection() {
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

        <div className="mt-8">
          <ContactForm />
        </div>
      </div>
    </section>
  );
}
