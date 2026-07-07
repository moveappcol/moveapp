import { getAirtableBase } from "./airtable";

export type Gym = {
  id: string;
  name: string;
  activities: string[];
  city: string;
  address: string;
  lat: number | null;
  lng: number | null;
  photoUrl: string | null;
  description: string | null;
};

/**
 * Esquema actual en Airtable — tabla "Gimnasios":
 *   - Nombre        (texto)
 *   - Actividades   (texto simple, una sola actividad por ahora)
 *   - Ciudad        (texto — hoy contiene la dirección, ej: "cll 93 b")
 *   - Latitud       (número, opcional — aún no está creada, se usa cuando exista)
 *   - Longitud      (número, opcional — aún no está creada, se usa cuando exista)
 *   - Foto          (adjunto, opcional — aún no está creada)
 *   - Descripción   (texto largo, opcional — aún no está creada)
 *   - Activo        (casilla, última columna — solo se traen los marcados)
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
    description: null,
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
    description: null,
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
    description: null,
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
    description: null,
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
    description: null,
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
    description: null,
  },
];

function isAirtableConfigured(): boolean {
  return Boolean(process.env.AIRTABLE_API_KEY && process.env.AIRTABLE_BASE_ID);
}

export async function getGyms(): Promise<{ gyms: Gym[]; usingMockData: boolean }> {
  if (!isAirtableConfigured()) {
    return { gyms: MOCK_GYMS, usingMockData: true };
  }

  const base = getAirtableBase();
  const records = await base("Gimnasios")
    .select({ filterByFormula: "{Activo} = 1" })
    .all();

  const gyms: Gym[] = records
    .filter((record) => Boolean(record.get("Nombre")))
    .map((record) => {
      const photos = record.get("Foto") as { url: string }[] | undefined;
      const activity = (record.get("Actividades") as string) ?? "";
      const address = (record.get("Ciudad") as string) ?? "";
      return {
        id: record.id,
        name: (record.get("Nombre") as string) ?? "Sin nombre",
        activities: activity.trim() ? [activity.trim()] : [],
        city: "",
        address: address.trim(),
        lat: (record.get("Latitud") as number) ?? null,
        lng: (record.get("Longitud") as number) ?? null,
        photoUrl: photos?.[0]?.url ?? null,
        description: (record.get("Descripción") as string) ?? null,
      };
    });

  return { gyms, usingMockData: false };
}
