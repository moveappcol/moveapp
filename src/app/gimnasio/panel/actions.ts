"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { getGymByManagerEmail } from "@/lib/gyms";
import { updateCuposTotales, type UpdateCuposResult } from "@/lib/classes";

/** Confirma que quien llama de verdad tiene sesión y está ligado a un
 * gimnasio — cada acción del panel pasa por acá primero, nunca confía en
 * lo que mande el formulario (el claseId sí se valida aparte, contra ese
 * gimnasioId, dentro de updateCuposTotales). */
async function requireGymManager(): Promise<{ id: string; name: string } | null> {
  const { userId } = await auth();
  if (!userId) return null;
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  if (!email) return null;
  return getGymByManagerEmail(email);
}

export async function actualizarCupos(
  claseId: string,
  _prevState: UpdateCuposResult | null,
  formData: FormData
): Promise<UpdateCuposResult> {
  const gym = await requireGymManager();
  if (!gym) return { ok: false, error: "No tienes acceso a ningún gimnasio." };

  const nuevoCupos = Number(formData.get("cupos"));
  const result = await updateCuposTotales(claseId, gym.id, nuevoCupos);
  if (result.ok) revalidatePath("/gimnasio/panel");
  return result;
}
