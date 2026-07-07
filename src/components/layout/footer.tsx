import Link from "next/link";

const CONTACT_EMAIL = "moveappcol@gmail.com";

export default function Footer() {
  return (
    <footer id="contacto" className="border-t border-move-green/10 bg-move-green text-white">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-3">
          <div>
            <p className="font-brand text-2xl font-bold uppercase tracking-tight">
              MOVE
            </p>
            <p className="mt-3 max-w-xs font-body text-sm text-white/70">
              Un solo plan de créditos para entrenar en los mejores gimnasios
              y estudios afiliados.
            </p>
          </div>

          <div>
            <p className="font-heading text-sm font-semibold uppercase tracking-wide text-move-lime">
              Contacto
            </p>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="mt-3 inline-block font-body text-sm text-white/90 underline-offset-4 hover:underline"
            >
              {CONTACT_EMAIL}
            </a>
          </div>

          <div>
            <p className="font-heading text-sm font-semibold uppercase tracking-wide text-move-lime">
              Política de cancelación
            </p>
            <p className="mt-3 font-body text-sm text-white/70">
              Puedes cancelar una clase hasta 24 horas antes sin costo.
              Pasado ese plazo, los créditos se cobran igual.
            </p>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-white/10 pt-6 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} MOVE. Todos los derechos reservados.</p>
          <nav className="flex gap-6">
            <Link href="/#gimnasios" className="hover:text-white">
              Gimnasios
            </Link>
            <Link href="/#planes" className="hover:text-white">
              Planes
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
