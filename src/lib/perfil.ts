import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getUserCreditsByEmail } from "./users";
import { getGymByManagerEmail } from "./gyms";

/** Si hay sesión activa pero el perfil no está completo (nombre, documento,
 * fecha de nacimiento, consentimientos), manda a completarlo antes de
 * seguir — evita cuentas "fantasma" que solo tienen el correo porque la
 * persona cerró la pestaña a mitad del registro y volvió a entrar
 * normal (ese flujo no pasa por el redirect inicial de Clerk). No hace
 * nada si no hay sesión — la navegación pública sigue libre.
 *
 * Quien administra un gimnasio inicia sesión con el mismo Clerk que los
 * clientes, pero nunca llena un perfil de cliente (cédula, fecha de
 * nacimiento) — no lo necesita. Sin este chequeo, cualquier gerente de
 * gimnasio que cayera en "/" (ej. al darle clic al logo) quedaba atrapado
 * en un loop: lo mandábamos a completar un perfil que nunca iba a llenar,
 * y cualquier link que probara para salir (como el logo, que manda a "/")
 * lo devolvía al mismo sitio — confirmado en producción. */
export async function requireCompleteProfileIfSignedIn(): Promise<void> {
  const { userId } = await auth();
  if (!userId) return;

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  if (!email) return;

  const gym = await getGymByManagerEmail(email);
  if (gym) return;

  const account = await getUserCreditsByEmail(email);
  if (!account?.perfilCompleto) {
    redirect("/completar-perfil");
  }
}
