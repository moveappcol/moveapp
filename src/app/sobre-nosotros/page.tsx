function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-10">
      <h2 className="font-heading text-lg font-semibold text-move-green">{title}</h2>
      <div className="mt-3 space-y-4 font-body text-sm leading-relaxed text-move-green/80">{children}</div>
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

export default function SobreNosotrosPage() {
  return (
    <section className="mx-auto max-w-2xl px-4 py-20 sm:px-6">
      <p className="font-body text-xs uppercase tracking-wide text-move-green/50">
        Sobre nosotros
      </p>
      <h1 className="mt-2 font-heading text-3xl font-bold text-move-green">
        UNIQUE — Quiénes somos
      </h1>

      <div className="mt-4 space-y-4 font-body text-sm leading-relaxed text-move-green/80">
        <p>Somos una plataforma que sabe que cada persona es única.</p>
        <p>
          Creemos que no existe una sola manera de entrenar. Por eso, a través de UNIQUE puedes
          explorar diferentes disciplinas en distintos gimnasios y estudios de la ciudad, hasta
          encontrar esa rutina que se adapta a TI.
        </p>
        <p>
          Con UNIQUE, tus créditos son tu llave. Los usas donde quieras, cuando quieras, y
          descubres experiencias de entrenamiento que antes solo veías desde afuera.
        </p>
        <p>
          No creemos en el entrenamiento único para todos. Creemos en la libertad de moverte a tu
          manera — y en construir, junto a los centros de entrenamiento que confían en nosotros,
          una forma más flexible, honesta y humana de cuidar tu bienestar.
        </p>
        <p>
          Esto apenas comienza. UNIQUE nace en Bogotá con la convicción de que el movimiento nos
          hace mejores personas, y con el compromiso de hacerlo accesible para más gente cada día.
        </p>
      </div>

      <Section title="¿Cómo funciona?">
        <p>
          En la plataforma puedes comprar distintos planes: Starter, Balance o Volume, el que más
          se adapte a ti. Cada plan te entrega un paquete de créditos mensual.
        </p>
        <p>
          Con los créditos que obtengas vas a poder acceder a todos los gimnasios de la
          plataforma: los usas para reservar la clase que quieras, en el centro aliado que
          quieras, sin atarte a uno solo.
        </p>
        <p>
          Cada gimnasio puede tener un costo de créditos diferente por clase — antes de reservar,
          siempre puedes ver cuántos créditos vale cada clase en cada centro, así que sabes
          exactamente cuánto te cuesta antes de confirmar.
        </p>
        <p>
          Puedes cancelar tu clase hasta 24 horas antes de la hora reservada sin que se te cobren
          los créditos. Si cancelas después de ese plazo, o no asistes, los créditos de esa clase
          sí se descuentan de tu cuenta.
        </p>
        <p>
          Los créditos tienen una vigencia de 1 mes: se renuevan cada ciclo junto con tu plan, así
          que la idea es usarlos dentro de ese mes para aprovechar al máximo tu membresía.
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
    </section>
  );
}
