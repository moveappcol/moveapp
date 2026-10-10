import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { requireGymManager, loadPanelDias } from "./data";
import PanelLive from "./panel-live";

export default async function GimnasioPanelPage() {
  const { userId } = await auth();
  if (!userId) redirect("/gimnasio/iniciar-sesion");

  const gym = await requireGymManager();
  if (!gym) redirect("/gimnasio");

  const dias = await loadPanelDias(gym.id);

  return (
    <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <div>
        <p className="font-heading text-sm font-semibold uppercase tracking-wide text-move-coral">
          Panel de gimnasio
        </p>
        <h1 className="mt-1 font-heading text-2xl font-bold text-move-green">{gym.name}</h1>
      </div>

      <p className="mt-2 font-body text-sm text-move-green/60">
        Sube o baja los cupos de cada clase, mira quién está inscrito y aprueba o rechaza
        la lista de espera. Esto se actualiza solo — no hace falta recargar.
      </p>

      <PanelLive initialDias={dias} />
    </section>
  );
}
