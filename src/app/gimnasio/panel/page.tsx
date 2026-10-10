import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getGymByManagerEmail } from "@/lib/gyms";
import { getClassesForGym } from "@/lib/classes";
import { fetchAllReservasDetalle, filterReservationsDetailForClase } from "@/lib/reservations";
import { formatHora, formatFechaLarga } from "@/lib/dias";
import CuposEditor from "./cupos-editor";

function esProxima(fecha: string | null): boolean {
  return Boolean(fecha) && new Date(fecha as string).getTime() > Date.now();
}

export default async function GimnasioPanelPage() {
  const { userId } = await auth();
  if (!userId) redirect("/gimnasio/iniciar-sesion");

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  const gym = email ? await getGymByManagerEmail(email) : null;
  if (!gym) redirect("/gimnasio");

  const [clases, todasLasReservas] = await Promise.all([
    getClassesForGym(gym.id),
    fetchAllReservasDetalle(),
  ]);

  const proximas = clases.filter((c) => esProxima(c.fecha));

  return (
    <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-heading text-sm font-semibold uppercase tracking-wide text-move-coral">
            Panel de gimnasio
          </p>
          <h1 className="mt-1 font-heading text-2xl font-bold text-move-green">{gym.name}</h1>
        </div>
        <Link
          href="/gimnasio/panel"
          className="rounded-full border border-move-green/20 px-4 py-2 font-heading text-xs font-semibold text-move-green transition-colors hover:border-move-green"
        >
          Actualizar
        </Link>
      </div>

      <p className="mt-2 font-body text-sm text-move-green/60">
        Sube o baja los cupos de cada clase, y mira quién está inscrito. Esto
        se refleja directo en la app — no hace falta avisarnos.
      </p>

      {proximas.length === 0 ? (
        <p className="mt-10 font-body text-sm text-move-green/60">
          No tienes clases próximas programadas todavía.
        </p>
      ) : (
        <div className="mt-8 space-y-4">
          {proximas.map((clase) => {
            const reservas = clase.fecha
              ? filterReservationsDetailForClase(todasLasReservas, clase.id, clase.fecha)
              : [];
            const activas = reservas.filter((r) => !r.estado.startsWith("Cancelado"));
            const canceladas = reservas.filter((r) => r.estado.startsWith("Cancelado"));

            return (
              <div
                key={clase.id}
                className="rounded-2xl border border-move-green/10 bg-white p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-heading text-base font-semibold text-move-green">
                      {clase.name}
                    </p>
                    <p className="mt-0.5 font-body text-sm text-move-green/60">
                      {clase.fecha
                        ? `${formatFechaLarga(clase.fecha)} · ${formatHora(clase.fecha)}`
                        : "Sin fecha confirmada"}
                    </p>
                    <p className="mt-0.5 font-body text-xs text-move-green/50">
                      {clase.credits} créditos
                    </p>
                  </div>
                  <CuposEditor claseId={clase.id} cuposActuales={clase.cuposTotales} />
                </div>

                <div className="mt-4 border-t border-move-green/10 pt-4">
                  <p className="font-heading text-xs font-semibold uppercase tracking-wide text-move-green/50">
                    Inscritos ({activas.length})
                  </p>
                  {activas.length === 0 ? (
                    <p className="mt-2 font-body text-sm text-move-green/50">
                      Nadie se ha inscrito todavía.
                    </p>
                  ) : (
                    <ul className="mt-2 space-y-1">
                      {activas.map((r) => (
                        <li key={r.id} className="font-body text-sm text-move-green/80">
                          {r.userName}
                          {r.molestias && (
                            <span className="text-move-coral"> — {r.molestias}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                  {canceladas.length > 0 && (
                    <p className="mt-3 font-body text-xs text-move-green/40">
                      {canceladas.length} cancelación
                      {canceladas.length === 1 ? "" : "es"}: {canceladas.map((r) => r.userName).join(", ")}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
