"use server";

import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { setUserCedula } from "@/lib/users";

export async function saveCedula(_prevState: { error: string } | null, formData: FormData) {
  const { userId } = await auth();
  if (!userId) redirect("/iniciar-sesion");

  const cedula = String(formData.get("cedula") ?? "").trim();
  if (!cedula) {
    return { error: "Ingresa tu número de cédula." };
  }

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  if (!email) {
    return { error: "Tu cuenta no tiene un correo asociado." };
  }

  await setUserCedula(email, cedula);
  redirect("/");
}
