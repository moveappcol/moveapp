export const TIPOS_DOCUMENTO = [
  "Cédula de ciudadanía",
  "Cédula de extranjería",
  "Pasaporte",
  "Otro",
] as const;

export type TipoDocumento = (typeof TIPOS_DOCUMENTO)[number];

export function isTipoDocumento(value: string): value is TipoDocumento {
  return (TIPOS_DOCUMENTO as readonly string[]).includes(value);
}

/** Valida el número de documento según el tipo — reglas simples, no
 * exhaustivas: solo buscan atrapar errores obvios de digitación. */
export function validateDocumentNumber(tipo: TipoDocumento, numero: string): string | null {
  const value = numero.trim();
  if (!value) return "Ingresa el número de tu documento.";

  switch (tipo) {
    case "Cédula de ciudadanía":
      if (!/^\d{6,11}$/.test(value)) {
        return "Ese número no parece válido — debe tener solo dígitos (6 a 11).";
      }
      return null;
    case "Cédula de extranjería":
    case "Pasaporte":
    case "Otro":
      if (!/^[A-Za-z0-9-]{5,15}$/.test(value)) {
        return "Ese número no parece válido — usa solo letras, números y guiones (5 a 15 caracteres).";
      }
      return null;
  }
}

/** Validación simple de celular colombiano (u otro, con o sin indicativo). */
export function validatePhone(telefono: string): string | null {
  const value = telefono.trim();
  if (!value) return "Ingresa tu número de teléfono.";
  if (!/^\+?[0-9\s-]{7,15}$/.test(value)) {
    return "Ese número de teléfono no parece válido.";
  }
  return null;
}

const MIN_AGE_YEARS = 18;

/** La Plataforma está reservada a mayores de edad (ver Términos y
 * Condiciones, cláusula 2) — se valida siempre en el servidor. */
export function validateFechaNacimiento(fecha: string): string | null {
  if (!fecha) return "Ingresa tu fecha de nacimiento.";

  const nacimiento = new Date(fecha);
  if (Number.isNaN(nacimiento.getTime())) return "Esa fecha de nacimiento no es válida.";

  const hoy = new Date();
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const aunNoCumple =
    hoy.getMonth() < nacimiento.getMonth() ||
    (hoy.getMonth() === nacimiento.getMonth() && hoy.getDate() < nacimiento.getDate());
  if (aunNoCumple) edad -= 1;

  if (edad < MIN_AGE_YEARS) {
    return "Debes ser mayor de 18 años para usar UNIQUE.";
  }
  return null;
}
