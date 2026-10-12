"use server";

import { revalidatePath } from "next/cache";
import {
  updateCuposTotales,
  getClaseById,
  precioEfectivo,
  getClaseTemplatesForGym,
  crearClaseDesdeTemplate,
  eliminarClase,
  type UpdateCuposResult,
  type ClaseTemplate,
  type CrearClaseResult,
  type EliminarClaseResult,
} from "@/lib/classes";
import { promoverEntradaListaEspera } from "@/lib/reservations";
import { markWaitlistDenied } from "@/lib/waitlist";
import { requireGymManager, loadPanelDias, type PanelDia } from "./data";

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

/** Releída por el panel en vivo cada pocos segundos (ver panel-live.tsx) —
 * así el gimnasio ve nuevas reservas, cancelaciones y gente en lista de
 * espera sin tener que recargar la página. */
export async function obtenerPanel(): Promise<PanelDia[] | null> {
  const gym = await requireGymManager();
  if (!gym) return null;
  return loadPanelDias(gym.id);
}

export async function aprobarListaEspera(
  claseId: string,
  entryId: string,
  correo: string,
  nombre: string
): Promise<UpdateCuposResult> {
  const gym = await requireGymManager();
  if (!gym) return { ok: false, error: "No tienes acceso a ningún gimnasio." };

  const clase = await getClaseById(claseId);
  if (!clase || clase.gimnasioId !== gym.id) {
    return { ok: false, error: "Esa clase no es de tu gimnasio." };
  }
  if (!clase.fecha) {
    return { ok: false, error: "Esa clase no tiene fecha confirmada." };
  }
  if (clase.cuposDisponibles <= 0) {
    return { ok: false, error: "No hay cupos disponibles para aprobar." };
  }

  const result = await promoverEntradaListaEspera({
    entryId,
    correo,
    nombre,
    claseId,
    gimnasioId: gym.id,
    gimnasioNombre: gym.name,
    claseCredits: precioEfectivo(clase),
    fechaISO: clase.fecha,
  });

  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath("/gimnasio/panel");
  return { ok: true };
}

export async function negarListaEspera(claseId: string, entryId: string): Promise<UpdateCuposResult> {
  const gym = await requireGymManager();
  if (!gym) return { ok: false, error: "No tienes acceso a ningún gimnasio." };

  const clase = await getClaseById(claseId);
  if (!clase || clase.gimnasioId !== gym.id) {
    return { ok: false, error: "Esa clase no es de tu gimnasio." };
  }

  await markWaitlistDenied(entryId);
  revalidatePath("/gimnasio/panel");
  return { ok: true };
}

/** Las clases "conocidas" de ESTE gimnasio (nunca de otro) para armar el
 * dropdown de "agregar clase" — ver getClaseTemplatesForGym. */
export async function obtenerClaseTemplates(): Promise<ClaseTemplate[]> {
  const gym = await requireGymManager();
  if (!gym) return [];
  return getClaseTemplatesForGym(gym.id);
}

export async function agregarClase(
  _prevState: CrearClaseResult | null,
  formData: FormData
): Promise<CrearClaseResult> {
  const gym = await requireGymManager();
  if (!gym) return { ok: false, error: "No tienes acceso a ningún gimnasio." };

  const templateId = String(formData.get("templateId") ?? "");
  const fecha = String(formData.get("fecha") ?? "");
  const hora = String(formData.get("hora") ?? "");
  const cupos = Number(formData.get("cupos"));

  if (!templateId) return { ok: false, error: "Elige una clase de la lista." };
  if (!fecha || !hora) return { ok: false, error: "Elige fecha y hora." };

  // fecha+hora se escriben en el input como hora local de Bogotá — se arma
  // el ISO sumando el offset fijo (-5, Bogotá no tiene horario de verano)
  // en vez de confiar en la zona horaria del navegador o del servidor.
  const horarioISO = new Date(`${fecha}T${hora}:00-05:00`).toISOString();

  const result = await crearClaseDesdeTemplate({
    gimnasioId: gym.id,
    templateId,
    horarioISO,
    cuposTotales: cupos,
  });

  if (result.ok) revalidatePath("/gimnasio/panel");
  return result;
}

export async function eliminarClasePanel(claseId: string): Promise<EliminarClaseResult> {
  const gym = await requireGymManager();
  if (!gym) return { ok: false, error: "No tienes acceso a ningún gimnasio." };

  const result = await eliminarClase(claseId, gym.id);
  if (result.ok) revalidatePath("/gimnasio/panel");
  return result;
}
