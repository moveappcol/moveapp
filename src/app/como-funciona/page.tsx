import type { Metadata } from "next";
import Link from "next/link";
import { CREDIT_PLANS, CREDIT_TOPUPS, formatCOP } from "@/lib/credits-pricing";

export const metadata: Metadata = {
  title: "¿Cómo funciona UNIQUE?",
  description:
    "Todo lo que necesitas saber sobre los planes de créditos de UNIQUE: cómo elegir un plan, cómo reservar clases, cancelaciones y más.",
};

type Step = { n: number; title: string; body: React.ReactNode };

const STEPS: Step[] = [
  {
    n: 1,
    title: "Elige tu plan de créditos",
    body: (
      <>
        <p>
          En UNIQUE no pagas por un solo gimnasio, pagas por un paquete de créditos mensual. Tienes
          tres planes — Starter, Balance o Volume — y eliges el que más se adapte a cuánto entrenas
          al mes.
        </p>
        <p>
          Si en algún mes se te acaban los créditos de tu plan, puedes comprar créditos
          adicionales (top-ups) sin cambiar de plan, siempre que ya tengas una suscripción activa.
        </p>
      </>
    ),
  },
  {
    n: 2,
    title: "Mira qué clase quieres tomar y cuánto cuesta",
    body: (
      <>
        <p>
          Cada gimnasio y cada clase tiene su propio costo en créditos — no es el mismo valor en
          todos lados. Antes de reservar, siempre puedes ver exactamente cuántos créditos te va a
          costar esa clase específica, así que nunca hay sorpresas ni cobros ocultos.
        </p>
      </>
    ),
  },
  {
    n: 3,
    title: "Reserva y entrena donde quieras",
    body: (
      <>
        <p>
          Con esos créditos accedes a toda la red de gimnasios y estudios afiliados a UNIQUE:
          cycling, boxing, yoga, pilates, funcional y más — reservas la clase que quieras, en el
          centro aliado que quieras, sin atarte a uno solo.
        </p>
        <p>
          Dos límites que vale la pena conocer: para promover que conozcas variedad de la red,
          hay un máximo de 3 reservas por gimnasio al mes; y algunos gimnasios son exclusivos para
          un género (lo vas a ver indicado en su perfil antes de reservar).
        </p>
      </>
    ),
  },
  {
    n: 4,
    title: "Tus créditos se renuevan cada mes",
    body: (
      <>
        <p>
          Tu plan se cobra una vez al mes y, junto con ese cobro, tus créditos se renuevan
          automáticamente. La idea es usarlos dentro de ese mes — los créditos no se acumulan de un
          ciclo a otro.
        </p>
      </>
    ),
  },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-14">
      <h2 className="font-heading text-xl font-bold text-move-green">{title}</h2>
      <div className="mt-3 space-y-3 font-body text-sm leading-relaxed text-move-green/80">
        {children}
      </div>
    </div>
  );
}

const FAQS: { q: string; a: string }[] = [
  {
    q: "¿Cuántas clases puedo tomar al mes?",
    a: "Depende de cuántos créditos tenga tu plan y del costo en créditos de cada clase (que varía según el gimnasio). En promedio, un paquete típico alcanza para varias clases al mes, repartidas entre los distintos centros aliados que elijas.",
  },
  {
    q: "¿Puedo ir varias veces al mismo gimnasio?",
    a: "Sí, aunque para promover la diversidad de la red y dar espacio a todos nuestros aliados, existe un límite de hasta 3 visitas mensuales por gimnasio dentro de tu plan.",
  },
  {
    q: "¿En qué ciudades está disponible UNIQUE?",
    a: "Por ahora, UNIQUE opera en Bogotá, donde estamos construyendo nuestra red de gimnasios y estudios aliados. Próximamente en más ciudades del país.",
  },
  {
    q: "¿Cómo elijo y reservo una clase?",
    a: "Desde la plataforma puedes ver el directorio de centros aliados, revisar horarios disponibles y reservar tu cupo directamente. Cada clase muestra cuántos créditos necesitas para tomarla, así sabes el costo antes de confirmar.",
  },
  {
    q: "¿Qué pasa si cancelo una clase reservada?",
    a: "Puedes cancelar tu reserva hasta 24 horas antes de la hora de la clase sin que se te cobren los créditos; en ese caso, tus créditos quedan disponibles en tu cuenta para que los uses en otra clase (siempre dentro de la vigencia del mes). Si cancelas después de ese plazo o no asistes, los créditos de esa clase se descuentan igualmente.",
  },
  {
    q: "¿Cómo me registro en UNIQUE?",
    a: "Creas tu cuenta desde la plataforma con tus datos básicos, aceptas nuestra Política de Tratamiento de Datos y Términos y Condiciones, y eliges el plan (Starter, Balance o Volume) que más se ajuste a ti.",
  },
  {
    q: "¿Cómo se maneja mi información personal?",
    a: "Tu información se maneja conforme a la Ley 1581 de Protección de Datos Personales. Solo compartimos con los gimnasios los datos necesarios para tu asistencia a las clases, y tú decides si quieres recibir comunicaciones promocionales — esa opción nunca viene marcada por defecto, y puedes desactivarla cuando quieras desde tu cuenta.",
  },
  {
    q: "¿Qué métodos de pago acepta UNIQUE?",
    a: "En UNIQUE puedes pagar como prefieras: tarjetas de crédito y débito (Visa, Mastercard, American Express), PSE, Nequi, Bancolombia y otros medios disponibles a través de Wompi, la pasarela de pagos respaldada por Bancolombia. Tu información viaja siempre encriptada y UNIQUE nunca almacena los datos de tu tarjeta — tus pagos son 100% seguros, de principio a fin.",
  },
  {
    q: "¿Tengo que firmar un contrato a largo plazo?",
    a: "No. UNIQUE está pensado para darte flexibilidad: adquieres tu plan de créditos según lo que elijas, sin permanencias forzosas de largo plazo, puedes cancelar tu plan cuando quieras.",
  },
  {
    q: "Tengo un gimnasio o estudio y quiero ser aliado de UNIQUE, ¿cómo hago?",
    a: "Nos encantaría conocerte. Escríbenos a través de nuestros canales de contacto en el formulario de nuestra página web y nos pondremos en contacto.",
  },
  {
    q: "¿Con quién hablo si tengo un problema o una pregunta?",
    a: "Puedes contactar a nuestro equipo de soporte a través del formulario de contacto en nuestra página web, te responderemos lo más rápido posible. Estamos para ayudarte a que tu experiencia con UNIQUE sea la mejor.",
  },
];

export default function ComoFuncionaPage() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
      <p className="font-body text-xs uppercase tracking-wide text-move-green/50">
        Cómo funciona
      </p>
      <h1 className="mt-2 font-heading text-3xl font-bold text-move-green sm:text-4xl">
        Un solo plan de créditos, toda la red de gimnasios
      </h1>
      <p className="mt-4 max-w-xl font-body text-move-green/70">
        Esta es la guía completa de cómo funciona UNIQUE, paso a paso — desde elegir tu plan hasta
        reservar tu primera clase.
      </p>

      <div className="mt-12 space-y-6">
        {STEPS.map((step) => (
          <div
            key={step.n}
            className="flex gap-5 rounded-3xl border border-move-green/10 bg-white p-6 sm:p-8"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-move-coral font-heading text-sm font-bold text-white">
              {step.n}
            </span>
            <div>
              <h3 className="font-heading text-lg font-bold text-move-green">{step.title}</h3>
              <div className="mt-2 space-y-2 font-body text-sm leading-relaxed text-move-green/80">
                {step.body}
              </div>
            </div>
          </div>
        ))}
      </div>

      <Section title="Nuestros planes">
        <div className="grid gap-4 sm:grid-cols-3">
          {CREDIT_PLANS.map((plan) => (
            <div
              key={plan.id}
              className="rounded-2xl border border-move-green/10 bg-white p-5 text-center"
            >
              <p className="font-heading text-sm font-semibold uppercase tracking-wide text-move-coral">
                {plan.name}
              </p>
              <p className="mt-1 font-heading text-2xl font-bold text-move-green">
                {plan.credits} créditos
              </p>
              <p className="mt-1 font-body text-xs text-move-green/60">al mes</p>
              <p className="mt-3 font-heading text-sm font-semibold text-move-green">
                {formatCOP(plan.price)}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-4">
          ¿Se te acabaron los créditos antes de fin de mes? Puedes comprar créditos adicionales sin
          cambiar de plan:{" "}
          {CREDIT_TOPUPS.map((t, i) => (
            <span key={t.id}>
              {i > 0 && " · "}
              {t.credits} créditos ({formatCOP(t.price)})
            </span>
          ))}
          .
        </p>
      </Section>

      <Section title="Cancelaciones y no-shows">
        <p>
          Puedes cancelar tu reserva hasta 24 horas antes de la hora de la clase sin que se te
          cobren los créditos — quedan disponibles en tu cuenta para usarlos en otra clase.
        </p>
        <p>
          Si cancelas después de ese plazo, o simplemente no asistes, los créditos de esa clase se
          descuentan igual — el gimnasio ya reservó ese cupo para ti.
        </p>
      </Section>

      <Section title="Sin permanencia">
        <p>
          No hay contratos de largo plazo. Tu plan se renueva mes a mes automáticamente, pero
          puedes cancelarlo cuando quieras desde &ldquo;Mi suscripción&rdquo;, sin penalidades.
        </p>
      </Section>

      <Section title="Métodos de pago">
        <p>
          Aceptamos tarjetas de crédito y débito (Visa, Mastercard, American Express), PSE, Nequi,
          Bancolombia y otros medios a través de Wompi, la pasarela de pagos respaldada por
          Bancolombia. Tu información viaja siempre encriptada — UNIQUE nunca almacena los datos de
          tu tarjeta.
        </p>
      </Section>

      <Section title="Preguntas frecuentes">
        <div className="space-y-3">
          {FAQS.map((item) => (
            <details
              key={item.q}
              className="group overflow-hidden rounded-2xl bg-move-green open:bg-white open:shadow-md open:ring-1 open:ring-move-green/10 transition-colors"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-heading text-sm font-semibold text-white marker:content-none group-open:text-move-green">
                {item.q}
                <span className="shrink-0 font-body text-xl leading-none text-move-lime transition-transform duration-200 group-open:rotate-45 group-open:text-move-coral">
                  +
                </span>
              </summary>
              <p className="px-5 pb-5 font-body text-sm leading-relaxed text-move-green/80">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </Section>

      <div className="mt-14 flex flex-col items-start gap-4 rounded-3xl bg-move-green px-8 py-8 text-white sm:flex-row sm:items-center sm:justify-between">
        <p className="font-heading text-lg font-bold">¿Listo para empezar a entrenar?</p>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a
          href="/#planes"
          className="shrink-0 rounded-full bg-move-coral px-6 py-3 font-heading text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          Ver planes de créditos
        </a>
      </div>

      <p className="mt-8 font-body text-xs text-move-green/50">
        ¿Todavía tienes dudas? Escríbenos desde{" "}
        <Link href="/#contacto" className="underline hover:text-move-coral">
          nuestro formulario de contacto
        </Link>
        .
      </p>
    </section>
  );
}
