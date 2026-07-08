import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getReservationsForUser } from "@/lib/reservations";
import { getClaseById } from "@/lib/classes";
import { getGymById } from "@/lib/gyms";
import CancelReservationButton from "@/components/gym/cancel-reservation-button";

export default async function MisReservasPage() {
  const { userId } = await auth();
  if (!userId) redirect("/iniciar-sesion");

  const user = await currentUser();
  const userName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.primaryEmailAddress?.emailAddress ||
    "";

  const reservations = await getReservationsForUser(userName);

  const enriched = await Promise.all(
    reservations.map(async (r) => ({
      ...r,
      clase: r.claseId ? await getClaseById(r.claseId) : null,
      gym: r.gimnasioId ? await getGymById(r.gimnasioId) : null,
    }))
  );

  return (
    <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="font-heading text-3xl font-bold text-move-green">
        Mis reservas
      </h1>

      {enriched.length === 0 ? (
        <p className="mt-6 font-body text-sm text-move-green/60">
          Todavía no tienes clases reservadas.
        </p>
      ) : (
        <ul className="mt-8 space-y-4">
          {enriched.map((r) => (
            <li
              key={r.id}
              className="rounded-2xl border border-move-green/10 bg-white p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-heading text-base font-semibold text-move-green">
                    {r.clase?.name ?? "Clase"} — {r.gym?.name ?? "Gimnasio"}
                  </p>
                  <p className="mt-1 font-body text-sm text-move-green/60">
                    {r.fecha
                      ? new Date(r.fecha).toLocaleString("es-CO", {
                          timeZone: "America/Bogota",
                        })
                      : "Sin fecha"}
                  </p>
                  <p className="mt-1 font-body text-xs font-medium uppercase tracking-wide text-move-green/50">
                    {r.estado ?? "Reservado"}
                  </p>
                </div>
                {r.estado === "Reservado" && (
                  <CancelReservationButton reservationId={r.id} />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
