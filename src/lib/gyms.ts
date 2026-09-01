import { getAirtableBase } from "./airtable";

// Cuando los gimnasios afiliados estén confirmados, cambiar a false para
// que la grilla y las páginas de detalle sean públicas.
export const GYMS_COMING_SOON = true;

/** Restricción de acceso por género. "todos" = sin restricción. */
export type GymGenero = "todos" | "solo_mujeres" | "solo_hombres";

export type Gym = {
  id: string;
  name: string;
  activities: string[];
  city: string;
  address: string;
  lat: number | null;
  lng: number | null;
  /** Foto que se ve en la grilla (antes de entrar al gimnasio). */
  photoUrl: string | null;
  /** Hasta 3 fotos que se ven dentro de la página del gimnasio. */
  photoDetailUrls: string[];
  genero: GymGenero;
  description: string | null;
  puntualidad: string | null;
  politicaCancelacion: string | null;
  ropaCalzado: string | null;
  materiales: string | null;
  servicios: string[];
  politicaMenores: string | null;
  nivelRecomendado: string | null;
  recomendaciones: string | null;
};

/**
 * Esquema actual en Airtable — tabla "Gimnasios" (ojo: varios nombres de
 * campo traen un espacio al final, hay que copiarlos tal cual):
 *   - Nombre                                     (texto)
 *   - Actividades                                (selección múltiple)
 *   - Ciudad                                     (texto — la ciudad real)
 *   - Dirección                                  (texto — dirección exacta)
 *   - Latitud                                    (número)
 *   - Longitud                                   (número)
 *   - Foto                                       (adjunto — se ve en la grilla)
 *   - "Foto detalle"                             (adjunto — hasta 3 fotos, se ven dentro del gimnasio)
 *   - Género                                     (selección: vacío = sin restricción; "Mujeres" = solo
 *      mujeres; "Hombres" = solo hombres; "Mujeres, Hombres" = sin restricción)
 *   - "Descripción "                             (texto largo)
 *   - Puntualidad                                (texto largo)
 *   - "Politica de cancelación "                 (texto largo)
 *   - "Ropa/calzado requerido "                  (texto largo)
 *   - "Materiales requeridos "                   (texto largo)
 *   - "Servicios y amenidades "                  (selección múltiple)
 *   - "Política para menores de edad"            (texto largo)
 *   - "Nivel recomendado (principiante/avanzado)" (texto largo)
 *   - "Recomendaciones adicionales"              (texto largo)
 *   - Activo                                     (casilla — solo se traen los marcados)
 *
 * "Numero" y "Reservas" existen en la base pero no se usan aquí todavía.
 */

// Datos de ejemplo — se usan si AIRTABLE_API_KEY/AIRTABLE_BASE_ID no están
// configurados, para que la sección funcione en desarrollo sin Airtable.
const MOCK_GYMS: Gym[] = [
  {
    id: "mock-1",
    name: "Cycling House",
    activities: ["Cycling"],
    city: "Bogotá",
    address: "Chapinero, Bogotá",
    lat: 4.6486,
    lng: -74.0628,
    photoUrl: null,
    photoDetailUrls: [],
    genero: "todos",
    description: "Clases de cycling con música en vivo y luces LED.",
    puntualidad: "Llega 10 minutos antes de tu clase.",
    politicaCancelacion: "Cancela con 24h de anticipación para no perder tus créditos.",
    ropaCalzado: "Ropa deportiva cómoda y tenis con suela plana.",
    materiales: "Prestamos zapatillas de spinning sin costo.",
    servicios: ["Casilleros", "Duchas", "Agua / hidratación"],
    politicaMenores: "Solo mayores de 16 años.",
    nivelRecomendado: "Apto para todos los niveles.",
    recomendaciones: "Trae toalla y una botella de agua.",
  },
  {
    id: "mock-2",
    name: "Box Fit Studio",
    activities: ["Boxing"],
    city: "Bogotá",
    address: "Usaquén, Bogotá",
    lat: 4.6946,
    lng: -74.0307,
    photoUrl: null,
    photoDetailUrls: [],
    genero: "todos",
    description: null,
    puntualidad: null,
    politicaCancelacion: null,
    ropaCalzado: null,
    materiales: null,
    servicios: [],
    politicaMenores: null,
    nivelRecomendado: null,
    recomendaciones: null,
  },
  {
    id: "mock-3",
    name: "Yoga Flow",
    activities: ["Yoga"],
    city: "Medellín",
    address: "Poblado, Medellín",
    lat: 6.2088,
    lng: -75.5679,
    photoUrl: null,
    photoDetailUrls: [],
    genero: "todos",
    description: null,
    puntualidad: null,
    politicaCancelacion: null,
    ropaCalzado: null,
    materiales: null,
    servicios: [],
    politicaMenores: null,
    nivelRecomendado: null,
    recomendaciones: null,
  },
  {
    id: "mock-4",
    name: "Núcleo Funcional",
    activities: ["Funcional"],
    city: "Bogotá",
    address: "Chicó, Bogotá",
    lat: 4.6707,
    lng: -74.0479,
    photoUrl: null,
    photoDetailUrls: [],
    genero: "todos",
    description: null,
    puntualidad: null,
    politicaCancelacion: null,
    ropaCalzado: null,
    materiales: null,
    servicios: [],
    politicaMenores: null,
    nivelRecomendado: null,
    recomendaciones: null,
  },
  {
    id: "mock-5",
    name: "Pilates Lab",
    activities: ["Pilates"],
    city: "Medellín",
    address: "Laureles, Medellín",
    lat: 6.2447,
    lng: -75.5916,
    photoUrl: null,
    photoDetailUrls: [],
    genero: "todos",
    description: null,
    puntualidad: null,
    politicaCancelacion: null,
    ropaCalzado: null,
    materiales: null,
    servicios: [],
    politicaMenores: null,
    nivelRecomendado: null,
    recomendaciones: null,
  },
  {
    id: "mock-6",
    name: "Iron Crossfit",
    activities: ["Crossfit"],
    city: "Medellín",
    address: "Envigado, Medellín",
    lat: 6.1719,
    lng: -75.5636,
    photoUrl: null,
    photoDetailUrls: [],
    genero: "todos",
    description: null,
    puntualidad: null,
    politicaCancelacion: null,
    ropaCalzado: null,
    materiales: null,
    servicios: [],
    politicaMenores: null,
    nivelRecomendado: null,
    recomendaciones: null,
  },
];

function isAirtableConfigured(): boolean {
  return Boolean(process.env.AIRTABLE_API_KEY && process.env.AIRTABLE_BASE_ID);
}

function textField(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  record: any,
  field: string
): string | null {
  const value = ((record.get(field) as string) ?? "").trim();
  return value || null;
}

/** El campo "Género" puede venir como texto único ("Mujeres", "Hombres",
 * "Mujeres, Hombres") o como selección múltiple (array). En cualquier caso,
 * si aparecen los dos géneros mencionados (o el campo está vacío) no hay
 * restricción. */
function normalizeGymGenero(raw: unknown): GymGenero {
  const text = (Array.isArray(raw) ? raw.join(", ") : ((raw as string) ?? "")).toLowerCase();
  const mencionaMujeres = text.includes("mujer");
  const mencionaHombres = text.includes("hombre");
  if (mencionaMujeres && mencionaHombres) return "todos";
  if (mencionaMujeres) return "solo_mujeres";
  if (mencionaHombres) return "solo_hombres";
  return "todos";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRecordToGym(record: any): Gym {
  const photos = record.get("Foto") as { url: string }[] | undefined;
  const photosDetail = record.get("Foto detalle") as { url: string }[] | undefined;
  const activities = (record.get("Actividades") as string[]) ?? [];
  const servicios = (record.get("Servicios y amenidades ") as string[]) ?? [];
  return {
    id: record.id,
    name: (record.get("Nombre") as string) ?? "Sin nombre",
    activities: activities.map((a) => a.trim()).filter(Boolean),
    city: ((record.get("Ciudad") as string) ?? "").trim(),
    address: ((record.get("Dirección") as string) ?? "").trim(),
    lat: (record.get("Latitud") as number) ?? null,
    lng: (record.get("Longitud") as number) ?? null,
    photoUrl: photos?.[0]?.url ?? null,
    photoDetailUrls: (photosDetail ?? []).slice(0, 3).map((p) => p.url),
    genero: normalizeGymGenero(record.get("Género")),
    description: textField(record, "Descripción "),
    puntualidad: textField(record, "Puntualidad"),
    politicaCancelacion: textField(record, "Politica de cancelación "),
    ropaCalzado: textField(record, "Ropa/calzado requerido "),
    materiales: textField(record, "Materiales requeridos "),
    servicios: servicios.map((s) => s.trim()).filter(Boolean),
    politicaMenores: textField(record, "Política para menores de edad"),
    nivelRecomendado: textField(record, "Nivel recomendado (principiante/avanzado)"),
    recomendaciones: textField(record, "Recomendaciones adicionales"),
  };
}

/** Un hombre no ve gimnasios "solo_mujeres" y viceversa. Sin género definido
 * (invitado sin cuenta, o "Otro") ve todos los gimnasios, sin filtrar. */
export function filterGymsByGenero(gyms: Gym[], userGenero: string | null): Gym[] {
  if (userGenero === "Hombre") return gyms.filter((g) => g.genero !== "solo_mujeres");
  if (userGenero === "Mujer") return gyms.filter((g) => g.genero !== "solo_hombres");
  return gyms;
}

export async function getGyms(): Promise<{ gyms: Gym[]; usingMockData: boolean }> {
  if (!isAirtableConfigured()) {
    return { gyms: MOCK_GYMS, usingMockData: true };
  }

  const base = getAirtableBase();
  const records = await base("Gimnasios")
    .select({ filterByFormula: "{Activo} = 1" })
    .all();

  const gyms = records.filter((r) => Boolean(r.get("Nombre"))).map(mapRecordToGym);

  return { gyms, usingMockData: false };
}

export async function getGymById(id: string): Promise<Gym | null> {
  if (!isAirtableConfigured()) {
    return MOCK_GYMS.find((g) => g.id === id) ?? null;
  }

  const base = getAirtableBase();
  try {
    const record = await base("Gimnasios").find(id);
    return mapRecordToGym(record);
  } catch {
    return null;
  }
}

export type GymBillingInfo = {
  id: string;
  name: string;
  email: string | null;
  pricePerReservation: number | null;
  /** Fracción (0.4 = 40%) — null si el gimnasio no tiene un porcentaje
   * propio configurado todavía en Airtable (se usa el default). */
  porcentajeTipoA: number | null;
  porcentajeTipoB: number | null;
};

/** Convierte el entero guardado en Airtable ("Porcentaje tipo A" = 40) a
 * fracción (0.4). */
function toPorcentaje(value: number | string | undefined): number | null {
  if (value === undefined || value === "") return null;
  return Number(value) / 100;
}

/** Datos de facturación del gimnasio — no forman parte del Gym público
 * (no se muestran en el storefront), solo se usan para liquidaciones. */
export async function getGymBillingInfo(id: string): Promise<GymBillingInfo | null> {
  const base = getAirtableBase();
  try {
    const record = await base("Gimnasios").find(id);
    const price = record.get("Precio por reserva") as number | string | undefined;
    return {
      id: record.id,
      name: ((record.get("Nombre") as string) ?? "").trim(),
      email: (record.get("Correo") as string) ?? null,
      pricePerReservation: price !== undefined ? Number(price) : null,
      porcentajeTipoA: toPorcentaje(record.get("Porcentaje tipo A") as number | string | undefined),
      porcentajeTipoB: toPorcentaje(record.get("Porcentaje tipo B") as number | string | undefined),
    };
  } catch {
    return null;
  }
}
