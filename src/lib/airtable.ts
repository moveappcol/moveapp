import Airtable from "airtable";

// El SDK de Airtable trae por defecto un requestTimeout de 300 segundos —
// si Airtable queda lenta o caída, cualquier llamada (de un cron o de un
// usuario real reservando) se queda colgada hasta 5 minutos antes de
// fallar. Lo bajamos a 30s: de sobra para una sola página de resultados en
// operación normal, y falla mucho más rápido cuando Airtable de verdad
// está teniendo problemas.
const AIRTABLE_REQUEST_TIMEOUT_MS = 30_000;

function getAirtableBase() {
  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID;

  if (!apiKey || !baseId) {
    throw new Error(
      "Faltan AIRTABLE_API_KEY o AIRTABLE_BASE_ID en las variables de entorno."
    );
  }

  return new Airtable({ apiKey, requestTimeout: AIRTABLE_REQUEST_TIMEOUT_MS }).base(baseId);
}

/** Escapa un valor para meterlo dentro de un string literal de una fórmula
 * de Airtable (filterByFormula). Sin esto, un nombre o correo con una
 * comilla doble puede romper la consulta o, peor, alterar la lógica de la
 * fórmula — igual que una inyección SQL, pero en el lenguaje de fórmulas
 * de Airtable. Siempre usar esto al interpolar un valor del usuario dentro
 * de un filterByFormula. */
export function escapeFormulaValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export { getAirtableBase };
