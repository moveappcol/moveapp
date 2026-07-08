import { notFound } from "next/navigation";
import { getGymById } from "@/lib/gyms";
import { getClassesForGym } from "@/lib/classes";
import ClassList from "@/components/gym/class-list";

export default async function GymPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const gym = await getGymById(id);
  if (!gym) notFound();

  const classes = await getClassesForGym(id);

  return (
    <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <p className="font-heading text-sm font-medium text-move-green/60">
        {gym.activities.join(", ")}
      </p>
      <h1 className="mt-1 font-heading text-3xl font-bold text-move-green">
        {gym.name}
      </h1>
      <p className="mt-2 font-body text-move-green/70">{gym.address}</p>

      <h2 className="mt-10 font-heading text-xl font-semibold text-move-green">
        Clases disponibles
      </h2>
      <div className="mt-4">
        <ClassList gimnasioId={id} classes={classes} />
      </div>
    </section>
  );
}
