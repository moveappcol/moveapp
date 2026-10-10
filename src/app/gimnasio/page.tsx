import Link from "next/link";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getGymByManagerEmail } from "@/lib/gyms";

/** Puerta de entrada para gimnasios afiliados — separada a propósito del
 * flujo de clientes (Iniciar sesión / Crear cuenta normales), aunque por
 * debajo usa la misma cuenta de Clerk: cualquier correo que ya esté
 * registrado como contacto de un gimnasio en Airtable (campo "Correo" en
 * Gimnasios) entra automático a su panel — ver getGymByManagerEmail. */
export default async function GimnasioLandingPage() {
  const { userId } = await auth();
  let gym = null;
  if (userId) {
    const user = await currentUser();
    const email = user?.primaryEmailAddress?.emailAddress;
    if (email) gym = await getGymByManagerEmail(email);
  }

  return (
    <section className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center sm:px-6">
      <span className="rounded-full bg-move-lime/40 px-4 py-1 font-heading text-xs font-semibold uppercase tracking-wide text-move-green">
        Para gimnasios afiliados
      </span>
      <h1 className="mt-6 font-heading text-3xl font-bold text-move-green">
        Soy un gimnasio
      </h1>
      <p className="mt-3 font-body text-move-green/70">
        Entra a tu panel para abrir los cupos de la semana y ver en vivo quién
        se inscribió a tus clases — sin tener que escribirnos para cambiar
        nada.
      </p>

      {gym ? (
        <Link
          href="/gimnasio/panel"
          className="mt-8 rounded-full bg-move-coral px-8 py-3 font-heading text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          Ir a mi panel
        </Link>
      ) : userId ? (
        <p className="mt-8 rounded-2xl border border-move-coral/30 bg-move-coral/5 p-4 font-body text-sm text-move-coral">
          Esta cuenta no está asociada a ningún gimnasio. Si crees que es un
          error, escríbenos.
        </p>
      ) : (
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/gimnasio/iniciar-sesion"
            className="rounded-full bg-move-coral px-8 py-3 font-heading text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            Iniciar sesión
          </Link>
          <Link
            href="/gimnasio/crear-cuenta"
            className="rounded-full border border-move-green/20 px-8 py-3 font-heading text-sm font-semibold text-move-green transition-colors hover:border-move-green"
          >
            Crear cuenta
          </Link>
        </div>
      )}
    </section>
  );
}
