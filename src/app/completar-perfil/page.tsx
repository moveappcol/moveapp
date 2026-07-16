import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getUserCreditsByEmail } from "@/lib/users";
import CedulaForm from "@/components/perfil/cedula-form";

export default async function CompletarPerfilPage() {
  const { userId } = await auth();
  if (!userId) redirect("/iniciar-sesion");

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  if (email) {
    const account = await getUserCreditsByEmail(email);
    if (account?.cedula) redirect("/");
  }

  return (
    <section className="mx-auto max-w-md px-4 py-20 sm:px-6">
      <h1 className="font-heading text-2xl font-bold text-move-green">
        Completa tu perfil
      </h1>
      <p className="mt-2 font-body text-sm text-move-green/70">
        Necesitamos tu número de cédula para poder identificarte en cada
        reserva. Solo te la pedimos una vez.
      </p>

      <div className="mt-8 rounded-2xl border border-move-green/10 bg-white p-6">
        <CedulaForm />
      </div>
    </section>
  );
}
