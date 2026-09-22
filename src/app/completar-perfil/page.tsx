import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getUserCreditsByEmail } from "@/lib/users";
import CompletarPerfilForm from "@/components/perfil/completar-perfil-form";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";

export default async function CompletarPerfilPage() {
  const { userId } = await auth();
  if (!userId) redirect("/iniciar-sesion");

  const t = getDictionary(await getLocale()).completarPerfil;

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  if (email) {
    const account = await getUserCreditsByEmail(email);
    if (account?.perfilCompleto) redirect("/");
  }

  return (
    <section className="mx-auto max-w-md px-4 py-20 sm:px-6">
      <h1 className="font-heading text-2xl font-bold text-move-green">{t.title}</h1>
      <p className="mt-2 font-body text-sm text-move-green/70">{t.subtitle}</p>

      <div className="mt-8 rounded-2xl border border-move-green/10 bg-white p-6">
        <CompletarPerfilForm
          defaultNombre={user?.firstName ?? ""}
          defaultApellido={user?.lastName ?? ""}
          t={t.form}
        />
      </div>
    </section>
  );
}
