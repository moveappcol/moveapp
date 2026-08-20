import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getUserCreditsByEmail } from "./users";

/** Si hay sesión activa pero el perfil no está completo (nombre, documento,
 * fecha de nacimiento, consentimientos), manda a completarlo antes de
 * seguir — evita cuentas "fantasma" que solo tienen el correo porque la
 * persona cerró la pestaña a mitad del registro y volvió a entrar
 * normal (ese flujo no pasa por el redirect inicial de Clerk). No hace
 * nada si no hay sesión — la navegación pública sigue libre. */
export async function requireCompleteProfileIfSignedIn(): Promise<void> {
  const { userId } = await auth();
  if (!userId) return;

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  if (!email) return;

  const account = await getUserCreditsByEmail(email);
  if (!account?.perfilCompleto) {
    redirect("/completar-perfil");
  }
}
