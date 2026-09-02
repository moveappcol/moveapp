import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getReservationsForUser, type Reservation } from "@/lib/reservations";
import { getClaseByIdBasic, type Clase } from "@/lib/classes";
import { getGymById } from "@/lib/gyms";
import { requireCompleteProfileIfSignedIn } from "@/lib/perfil";
import CancelReservationButton from "@/components/gym/cancel-reservation-button";
import RateClassForm from "@/components/gym/rate-class-form";

const RATING_WINDOW_HOURS = 24;

function ratingWindowState(
  r: Reservation & { clase: Clase | null }
): "puede-calificar" | "ya-califico" | "no-aplica" {
  if (!r.clase?.fecha || r.estado?.startsWith("Cancelado")) return "no-aplica";
  if (r.calificacion !== null) return "ya-califico";

  const finClase = new Date(r.clase.fecha).getTime() + r.clase.duracionMinutos * 60_000;
  const now = Date.now();
  if (now < finClase || now > finClase + RATING_WINDOW_HOURS * 60 * 60 * 1000) return "no-aplica";
  return "puede-calificar";
}

export default async function MisReservasPage() {
  const { userId } = await auth();
  if (!userId) redirect("/iniciar-sesion");
  await requireCompleteProfileIfSignedIn();

  const user = await currentUser();
  const userName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.primaryEmailAddress?.emailAddress ||
    "";

  const reservations = await getReservationsForUser(userName);

  const enriched = await Promise.all(
    reservations.map(async (r) => {
      const [clase, gym] = await Promise.all([
        r.claseId ? getClaseByIdBasic(r.claseId) : Promise.resolve(null),
        r.gimnasioId ? getGymById(r.gimnasioId) : Promise.resolve(null),
      ]);
      return { ...r, clase, gym };
    })
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

              {ratingWindowState(r) === "puede-calificar" && (
                <RateClassForm reservationId={r.id} />
              )}
              {ratingWindowState(r) === "ya-califico" && (
                <p className="mt-2 font-body text-sm text-move-green/70">
                  Calificaste esta clase: {"★".repeat(r.calificacion ?? 0)}
                  {"☆".repeat(5 - (r.calificacion ?? 0))}
                  {r.comentario ? ` — "${r.comentario}"` : ""}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
