"use server";

import { redirect } from "next/navigation";
import { auth, currentUser, clerkClient } from "@clerk/nextjs/server";
import { completeProfile } from "@/lib/users";
import {
  isTipoDocumento,
  isGenero,
  validateDocumentNumber,
  validatePhone,
  validateFechaNacimiento,
} from "@/lib/documento";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";

export async function saveCompletarPerfil(_prevState: { error: string } | null, formData: FormData) {
  const { userId } = await auth();
  if (!userId) redirect("/iniciar-sesion");

  const t = getDictionary(await getLocale()).completarPerfil.errors;

  const nombre = String(formData.get("nombre") ?? "").trim();
  const apellido = String(formData.get("apellido") ?? "").trim();
  const telefono = String(formData.get("telefono") ?? "").trim();
  const tipoDocumento = String(formData.get("tipoDocumento") ?? "").trim();
  const cedula = String(formData.get("cedula") ?? "").trim();
  const fechaNacimiento = String(formData.get("fechaNacimiento") ?? "").trim();
  const genero = String(formData.get("genero") ?? "").trim();
  const terminosAceptados = formData.get("terminosAceptados") === "on";
  const tratamientoDatosAceptado = formData.get("tratamientoDatosAceptado") === "on";
  const marketingAceptado = formData.get("marketingAceptado") === "on";

  if (!nombre) return { error: t.ingresaNombre };
  if (!apellido) return { error: t.ingresaApellido };

  const phoneError = validatePhone(telefono);
  if (phoneError) return { error: phoneError };

  if (!isTipoDocumento(tipoDocumento)) {
    return { error: t.tipoDocumentoInvalido };
  }

  const documentError = validateDocumentNumber(tipoDocumento, cedula);
  if (documentError) return { error: documentError };

  const fechaNacimientoError = validateFechaNacimiento(fechaNacimiento);
  if (fechaNacimientoError) return { error: fechaNacimientoError };

  if (!isGenero(genero)) {
    return { error: t.generoInvalido };
  }

  if (!terminosAceptados) {
    return { error: t.debeAceptarTerminos };
  }
  if (!tratamientoDatosAceptado) {
    return { error: t.debeAceptarTratamiento };
  }

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  if (!email) {
    return { error: t.sinCorreo };
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
    genero,
    terminosAceptados,
    tratamientoDatosAceptado,
    marketingAceptado,
  });

  redirect("/?perfil=completo");
}
