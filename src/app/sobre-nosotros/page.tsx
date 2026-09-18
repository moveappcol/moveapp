import Link from "next/link";

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

      <div className="mt-10 rounded-3xl bg-move-green/[0.04] p-6">
        <p className="font-body text-sm leading-relaxed text-move-green/80">
          ¿Quieres saber exactamente cómo funcionan los créditos, los planes y las reservas?{" "}
          <Link href="/como-funciona" className="font-semibold text-move-coral underline">
            Mira la guía completa de cómo funciona UNIQUE
          </Link>
          , con preguntas frecuentes incluidas.
        </p>
      </div>
    </section>
  );
}
