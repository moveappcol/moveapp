"use server";

import { redirect } from "next/navigation";
import { auth, currentUser, clerkClient } from "@clerk/nextjs/server";
import { completeProfile } from "@/lib/users";
import {
  isTipoDocumento,
  validateDocumentNumber,
  validatePhone,
  validateFechaNacimiento,
} from "@/lib/documento";

export async function saveCompletarPerfil(_prevState: { error: string } | null, formData: FormData) {
  const { userId } = await auth();
  if (!userId) redirect("/iniciar-sesion");

  const nombre = String(formData.get("nombre") ?? "").trim();
  const apellido = String(formData.get("apellido") ?? "").trim();
  const telefono = String(formData.get("telefono") ?? "").trim();
  const tipoDocumento = String(formData.get("tipoDocumento") ?? "").trim();
  const cedula = String(formData.get("cedula") ?? "").trim();
  const fechaNacimiento = String(formData.get("fechaNacimiento") ?? "").trim();
  const terminosAceptados = formData.get("terminosAceptados") === "on";
  const tratamientoDatosAceptado = formData.get("tratamientoDatosAceptado") === "on";
  const marketingAceptado = formData.get("marketingAceptado") === "on";

  if (!nombre) return { error: "Ingresa tu nombre." };
  if (!apellido) return { error: "Ingresa tu apellido." };

  const phoneError = validatePhone(telefono);
  if (phoneError) return { error: phoneError };

  if (!isTipoDocumento(tipoDocumento)) {
    return { error: "Selecciona un tipo de documento válido." };
  }

  const documentError = validateDocumentNumber(tipoDocumento, cedula);
  if (documentError) return { error: documentError };

  const fechaNacimientoError = validateFechaNacimiento(fechaNacimiento);
  if (fechaNacimientoError) return { error: fechaNacimientoError };

  if (!terminosAceptados) {
    return { error: "Debes aceptar los términos y condiciones para continuar." };
  }
  if (!tratamientoDatosAceptado) {
    return { error: "Debes aceptar el tratamiento de datos personales para continuar." };
  }

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  if (!email) {
    return { error: "Tu cuenta no tiene un correo asociado." };
  }

  const clerk = await clerkClient();
  await clerk.users.updateUser(userId, { firstName: nombre, lastName: apellido });

  await completeProfile({
    email,
    nombre,
    apellido,
    telefono,
    tipoDocumento,
    cedula,
    fechaNacimiento,
    terminosAceptados,
    tratamientoDatosAceptado,
    marketingAceptado,
  });

  redirect("/");
}
