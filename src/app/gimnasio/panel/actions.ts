"use server";

import { revalidatePath } from "next/cache";
import { updateCuposTotales, getClaseById, precioEfectivo, type UpdateCuposResult } from "@/lib/classes";
import { promoverEntradaListaEspera } from "@/lib/reservations";
import { markWaitlistDenied } from "@/lib/waitlist";
import { requireGymManager, loadPanelClases, type PanelClase } from "./data";

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
export async function obtenerPanel(): Promise<PanelClase[] | null> {
  const gym = await requireGymManager();
  if (!gym) return null;
  return loadPanelClases(gym.id);
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
