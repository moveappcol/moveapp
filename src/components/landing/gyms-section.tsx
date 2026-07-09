import { getGyms } from "@/lib/gyms";
import GymsExplorer from "./gyms-explorer";

// Cuando los gimnasios afiliados estén confirmados, cambiar a false para
// volver a mostrar el buscador y la grilla real.
const GYMS_COMING_SOON = true;

export default async function GymsSection() {
  if (GYMS_COMING_SOON) {
    return (
      <section id="gimnasios" className="bg-background">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
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
          </div>
        </div>
      </section>
    );
  }

  const { gyms, usingMockData } = await getGyms();

  return (
    <section id="gimnasios" className="bg-background">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
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
