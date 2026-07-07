import { getGyms } from "@/lib/gyms";
import GymsExplorer from "./gyms-explorer";

export default async function GymsSection() {
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
