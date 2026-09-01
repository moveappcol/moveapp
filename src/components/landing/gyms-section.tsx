import { auth, currentUser } from "@clerk/nextjs/server";
import { getGyms, GYMS_COMING_SOON, filterGymsByGenero } from "@/lib/gyms";
import { getUserCreditsByEmail } from "@/lib/users";
import GymsExplorer from "./gyms-explorer";
import ViewTracker from "@/components/analytics/view-tracker";

const GYMS_VIEW_EVENT_PARAMS = {
  content_name: "Gimnasios afiliados",
  content_category: "Gimnasios",
};

export default async function GymsSection() {
  // En local (npm run dev) se ve la grilla real para poder probarla; en
  // producción sigue mostrando "Coming soon" mientras GYMS_COMING_SOON siga
  // en true.
  if (GYMS_COMING_SOON && process.env.NODE_ENV !== "development") {
    return (
      <section id="gimnasios" className="bg-background">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <ViewTracker event="ViewContent" params={GYMS_VIEW_EVENT_PARAMS} />
          <h2 className="font-heading text-3xl font-bold text-move-green">
            Gimnasios afiliados
          </h2>
          <p className="mt-2 max-w-xl font-body text-move-green/70">
            Busca gimnasios cerca de ti y filtra por tipo de actividad.
          </p>

          <div className="mt-12 flex flex-col items-center justify-center rounded-3xl border border-move-green/10 bg-move-green/[0.03] py-24 text-center">
            <span className="font-heading text-4xl font-bold uppercase tracking-tight text-move-coral sm:text-5xl">
              Coming soon
            </span>
            <p className="mt-4 max-w-md font-body text-sm text-move-green/60">
              Estamos confirmando los primeros gimnasios afiliados. Muy pronto
              podrás verlos y reservar clases aquí.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              {["Boxing", "Indoor Cycling", "Pilates", "Funcional"].map((activity) => (
                <span
                  key={activity}
                  className="rounded-full border border-move-green/15 bg-white px-4 py-2 font-heading text-xs font-medium text-move-green/70"
                >
                  {activity}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  const { gyms: allGyms, usingMockData } = await getGyms();

  let userGenero: string | null = null;
  const { userId } = await auth();
  if (userId) {
    const user = await currentUser();
    const email = user?.primaryEmailAddress?.emailAddress;
    if (email) {
      const account = await getUserCreditsByEmail(email);
      userGenero = account?.genero ?? null;
    }
  }
  const gyms = filterGymsByGenero(allGyms, userGenero);

  return (
    <section id="gimnasios" className="bg-background">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <ViewTracker event="ViewContent" params={GYMS_VIEW_EVENT_PARAMS} />
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-heading text-3xl font-bold text-move-green">
              Gimnasios afiliados
            </h2>
            <p className="mt-2 max-w-xl font-body text-move-green/70">
              Busca gimnasios cerca de ti y filtra por tipo de actividad.
            </p>
          </div>
          {usingMockData && (
            <span className="rounded-full bg-move-green/5 px-3 py-1 font-heading text-xs font-medium text-move-green/60">
              Datos de ejemplo — conecta Airtable para ver gimnasios reales
            </span>
          )}
        </div>

        <GymsExplorer gyms={gyms} />
      </div>
    </section>
  );
}
