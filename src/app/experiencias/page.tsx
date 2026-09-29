import { redirect } from "next/navigation";
import { getGyms, esGimnasioDeExperiencias } from "@/lib/gyms";

/** "Experiencias" no es una sección propia — es el gimnasio especial que
 * UNIQUE usa para publicar sus propios eventos (ver esGimnasioDeExperiencias
 * en gyms.ts). Este link del menú solo busca ese gimnasio por nombre y
 * manda derecho a su página real; si todavía no existe en Airtable, cae de
 * vuelta a la grilla de gimnasios. */
export default async function ExperienciasRedirect() {
  const { gyms } = await getGyms();
  const gimnasioExperiencias = gyms.find((g) => esGimnasioDeExperiencias(g.name));

  redirect(gimnasioExperiencias ? `/gimnasios/${gimnasioExperiencias.id}` : "/#gimnasios");
}
