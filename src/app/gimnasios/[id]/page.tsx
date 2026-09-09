import { notFound } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getGymById, GYMS_COMING_SOON } from "@/lib/gyms";
import { getClassesForGym } from "@/lib/classes";
import { getWaitlistStatus } from "@/lib/waitlist";
import ClassList, { type WaitlistStatusMap } from "@/components/gym/class-list";

function InfoSection({ title, text }: { title: string; text: string | null }) {
  if (!text) return null;
  return (
    <div className="mt-6">
      <h3 className="font-heading text-sm font-semibold text-move-green">{title}</h3>
      <p className="mt-1 whitespace-pre-line font-body text-sm text-move-green/70">{text}</p>
    </div>
  );
}

export default async function GymPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // La sección de gimnasios todavía no es pública — mientras se termina de
  // construir, el link directo tampoco debe abrir en producción. En local
  // (npm run dev) sí se puede seguir viendo para probar mientras se arma.
  if (GYMS_COMING_SOON && process.env.NODE_ENV !== "development") notFound();

  const { id } = await params;
  const gym = await getGymById(id);
  if (!gym) notFound();

  const classes = await getClassesForGym(id);

  const waitlistStatus: WaitlistStatusMap = {};
  const { userId } = await auth();
  if (userId) {
    const user = await currentUser();
    const email = user?.primaryEmailAddress?.emailAddress;
    if (email) {
      const llenas = classes.filter((c) => c.cuposDisponibles <= 0);
      const statuses = await Promise.all(
        llenas.map((c) => getWaitlistStatus(c.id, email))
      );
      llenas.forEach((c, i) => {
        waitlistStatus[c.id] = statuses[i];
      });
    }
  }

  const generoLabel =
    gym.genero === "solo_mujeres"
      ? "Gimnasio exclusivo para mujeres"
      : gym.genero === "solo_hombres"
        ? "Gimnasio exclusivo para hombres"
        : null;

  return (
    <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <p className="font-heading text-sm font-medium text-move-green/60">
        {gym.activities.join(", ")}
      </p>
      <h1 className="mt-1 font-heading text-3xl font-bold text-move-green">
        {gym.name}
      </h1>
      <p className="mt-2 font-body text-move-green/70">
        {[gym.address, gym.city].filter(Boolean).join(", ")}
      </p>

      {generoLabel && (
        <span className="mt-3 inline-block rounded-full bg-move-coral/10 px-3 py-1 font-heading text-xs font-semibold uppercase tracking-wide text-move-coral">
          {generoLabel}
        </span>
      )}

      {gym.photoDetailUrls.length > 0 && (
        <div className="mt-6 grid grid-cols-3 gap-3">
          {gym.photoDetailUrls.map((url) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={url}
              src={url}
              alt={gym.name}
              className="aspect-square w-full rounded-2xl object-cover"
            />
          ))}
        </div>
      )}

      <InfoSection title="Descripción" text={gym.description} />
      <InfoSection title="Puntualidad" text={gym.puntualidad} />
      <InfoSection title="Política de cancelación" text={gym.politicaCancelacion} />
      <InfoSection title="Ropa / calzado" text={gym.ropaCalzado} />
      <InfoSection title="Materiales" text={gym.materiales} />

      {gym.servicios.length > 0 && (
        <div className="mt-6">
          <h3 className="font-heading text-sm font-semibold text-move-green">
            Servicios y amenidades
          </h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {gym.servicios.map((servicio) => (
              <span
                key={servicio}
                className="rounded-full border border-move-green/15 px-3 py-1 font-body text-xs text-move-green/70"
              >
                {servicio}
              </span>
            ))}
          </div>
        </div>
      )}

      <InfoSection title="Política para menores de edad" text={gym.politicaMenores} />
      <InfoSection title="Nivel recomendado" text={gym.nivelRecomendado} />
      <InfoSection title="Recomendaciones" text={gym.recomendaciones} />

      <h2 className="mt-10 font-heading text-xl font-semibold text-move-green">
        Clases disponibles
      </h2>
      <div className="mt-4">
        <ClassList gimnasioId={id} classes={classes} waitlistStatus={waitlistStatus} />
      </div>
    </section>
  );
}
