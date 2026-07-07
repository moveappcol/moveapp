import Airtable from "airtable";

// Scaffold para el paso de "Gimnasios" (sección 2). Todavía no se usa en
// ninguna página — se activa cuando exista AIRTABLE_API_KEY/AIRTABLE_BASE_ID
// y la base tenga una tabla de gimnasios definida.
function getAirtableBase() {
  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID;

  if (!apiKey || !baseId) {
    throw new Error(
      "Faltan AIRTABLE_API_KEY o AIRTABLE_BASE_ID en las variables de entorno."
    );
  }

  return new Airtable({ apiKey }).base(baseId);
}

export { getAirtableBase };
