import type { TipoDocumento } from "./documento";

/**
 * Integración con la API de Dataico (facturación electrónica DIAN).
 * Documentación: https://app.dataico.com/api-docs — sección "facturas",
 * POST /invoices ("Crear una nueva factura").
 *
 * OJO — hay 3-4 valores de enumeración (party_identification_type,
 * tax_level_code, payment_means / payment_means_type) que la documentación
 * de Swagger solo muestra con UN ejemplo cada uno, no la lista completa de
 * valores válidos. Se usaron los más razonables según ese ejemplo y los
 * códigos estándar de la DIAN, pero quedan marcados abajo — la primera
 * factura real en modo PRUEBAS puede rebotar con un error de validación
 * señalando cuál exactamente hay que ajustar (Dataico devuelve el campo
 * exacto en {"errors": {"campo": ["mensaje"]}}).
 */

const DATAICO_API_URL = "https://api.dataico.com/direct/dataico_api/v2/invoices";

/** Cuenta y resolución de facturación de UNIQUE APP S.A.S. — no son
 * secretos (a diferencia del API key, que vive en DATAICO_API_KEY), así
 * que viven acá como constantes en vez de variables de entorno. */
const DATAICO_ACCOUNT_ID = "01a0cbf0-36ea-8a42-ae99-e228c1293090";
const RESOLUTION_NUMBER = "18764116030884";
const RESOLUTION_PREFIX = "UNQ";
const IVA_RATE = 19;

/** "PRUEBAS" no envía nada real a la DIAN — se usa hasta confirmar que la
 * primera factura de verdad pasa sin errores de validación. Cambiar a
 * DATAICO_ENV=PRODUCCION en Railway cuando esté listo. */
function dataicoEnv(): "PRUEBAS" | "PRODUCCION" {
  return process.env.DATAICO_ENV === "PRODUCCION" ? "PRODUCCION" : "PRUEBAS";
}

/** Mapeo de los tipos de documento de UNIQUE (lib/documento.ts) al código
 * que espera Dataico. "CC"/"CE" están confirmados por el patrón que usa
 * la API (ver nota arriba); "Pasaporte" y "Otro" son la mejor suposición
 * razonable, sin confirmar contra un ejemplo real. */
const DIAN_IDENTIFICATION_TYPE: Record<TipoDocumento, string> = {
  "Cédula de ciudadanía": "CC",
  "Cédula de extranjería": "CE",
  Pasaporte: "PASAPORTE",
  Otro: "NUIP",
};

function formatFechaDian(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

function formatFechaHoraDian(d: Date): string {
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${formatFechaDian(d)} ${hh}:${mi}:${ss}`;
}

export type CreateInvoiceParams = {
  concepto: string;
  /** Total en COP que ya pagó la persona — con IVA incluido (así se le
   * muestra el precio en toda la plataforma). Se desglosa acá mismo en
   * base + IVA para la factura. */
  totalConIva: number;
  correo: string;
  nombre: string;
  apellido: string;
  tipoDocumento: TipoDocumento | null;
  cedula: string;
  telefono: string | null;
};

export type CreateInvoiceResult =
  | { ok: true; uuid: string; pdfUrl: string; cufe: string }
  | { ok: false; error: string };

/** Crea y envía a la DIAN una factura electrónica por una compra ya
 * cobrada (plan o créditos adicionales). Nunca se debe dejar que un fallo
 * acá reviente el flujo de pago — el cobro y el abono de créditos ya
 * pasaron antes de llamar a esto; si la factura falla, se avisa por
 * correo para generarla manual, no se le muestra ningún error al
 * comprador. */
export async function createElectronicInvoice(
  params: CreateInvoiceParams
): Promise<CreateInvoiceResult> {
  const apiKey = process.env.DATAICO_API_KEY;
  if (!apiKey) return { ok: false, error: "Falta la variable de entorno DATAICO_API_KEY." };

  if (!params.cedula || !params.nombre || !params.apellido) {
    return { ok: false, error: "Falta nombre, apellido o cédula en el perfil del comprador." };
  }

  const totalConIva = Math.round(params.totalConIva);
  const base = Math.round(totalConIva / (1 + IVA_RATE / 100));
  const iva = totalConIva - base;
  const now = new Date();

  const body = {
    actions: {
      send_dian: true,
      // El correo lo manda UNIQUE con su propio diseño (ver email.ts) —
      // Dataico no debe mandar el suyo también.
      send_email: false,
    },
    invoice: {
      dataico_account_id: DATAICO_ACCOUNT_ID,
      env: dataicoEnv(),
      invoice_type_code: "FACTURA_VENTA",
      issue_date: formatFechaDian(now),
      payment_date: formatFechaHoraDian(now),
      currency: "COP",
      numbering: {
        resolution_number: RESOLUTION_NUMBER,
        prefix: RESOLUTION_PREFIX,
        flexible: true,
      },
      // Pago con tarjeta a través de Wompi, siempre de contado.
      payment_means_type: "CONTADO",
      payment_means: "TARJETA_CREDITO",
      customer: {
        party_type: "PERSONA_NATURAL",
        first_name: params.nombre,
        last_name: params.apellido,
        party_identification_type:
          (params.tipoDocumento && DIAN_IDENTIFICATION_TYPE[params.tipoDocumento]) || "CC",
        party_identification: params.cedula,
        email: params.correo,
        phone: params.telefono || undefined,
      },
      items: [
        {
          description: params.concepto,
          quantity: 1,
          price: base,
          "measuring-unit": "UND",
          taxes: [
            {
              "tax-category": "IVA",
              "tax-rate": IVA_RATE,
              "tax-amount": iva,
              "tax-base": base,
            },
          ],
        },
      ],
    },
  };

  let res: Response;
  try {
    res = await fetch(DATAICO_API_URL, {
      method: "POST",
      headers: { "Content-type": "application/json", "auth-token": apiKey },
      body: JSON.stringify(body),
    });
  } catch (err) {
    return { ok: false, error: `No se pudo conectar con Dataico: ${err instanceof Error ? err.message : String(err)}` };
  }

  const json = await res.json().catch(() => null);

  if (!res.ok || !json?.uuid) {
    // Dataico devuelve los errores de validación como
    // {"errors": {"campo.anidado": ["mensaje"]}} — se manda tal cual para
    // poder ajustar el campo exacto que rebote.
    return {
      ok: false,
      error: `Dataico respondió ${res.status}: ${JSON.stringify(json ?? {})}`,
    };
  }

  return { ok: true, uuid: json.uuid, pdfUrl: json.pdf_url, cufe: json.cufe };
}
