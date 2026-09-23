import type { TipoDocumento } from "./documento";

/**
 * Integración con la API de Dataico (facturación electrónica DIAN).
 * Documentación: https://app.dataico.com/api-docs — sección "facturas",
 * POST /invoices ("Crear una nueva factura").
 *
 * party_identification_type, party_type, payment_means y measuring-unit ya
 * están confirmados con soporte de Dataico (2026-09-23) — ver comentarios
 * en cada valor. payment_means_type ("CONTADO") sigue sin confirmar contra
 * un ejemplo real de ellos; si una factura rebota señalando ese campo
 * específico, Dataico devuelve el nombre exacto en
 * {"errors": {"campo": ["mensaje"]}}.
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
  /** Consecutivo dentro del rango de la resolución DIAN — ya reservado por
   * el llamador (ver reserveNextFacturaNumero en pagos.ts). */
  numero: number;
  /** Referencia/SKU del ítem del catálogo (ej. "topup-5", "plan-starter") —
   * Dataico lo exige para poder facturar (soporte, 2026-09-23). */
  sku: string;
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
      // Dataico exige el número explícito aunque la numeración sea
      // "flexible" — no lo asigna solo (confirmado en pruebas, 2026-09-23).
      number: params.numero,
      numbering: {
        resolution_number: RESOLUTION_NUMBER,
        prefix: RESOLUTION_PREFIX,
        flexible: true,
      },
      // Pago con tarjeta a través de Wompi. Valores confirmados con soporte
      // de Dataico (2026-09-23): payment_means "CREDIT_CARD" (no
      // "TARJETA_CREDITO"); payment_means_type solo acepta
      // "CREDITO"/"DEBITO" (no "CONTADO") — Wompi siempre cobra crédito.
      payment_means_type: "CREDITO",
      payment_means: "CREDIT_CARD",
      customer: {
        party_type: "PERSONA_NATURAL",
        first_name: params.nombre,
        // El campo del apellido en el esquema de Dataico se llama
        // "family_name", no "last_name" (visto en su ejemplo de
        // documentación) — con "last_name" el apellido no se reconocía y
        // Dataico rechazaba con "El nombre del tercero es incorrecto."
        family_name: params.apellido,
        party_identification_type:
          (params.tipoDocumento && DIAN_IDENTIFICATION_TYPE[params.tipoDocumento]) || "CC",
        party_identification: params.cedula,
        email: params.correo,
        phone: params.telefono || undefined,
      },
      items: [
        {
          sku: params.sku,
          description: params.concepto,
          quantity: 1,
          price: base,
          // "94" = código DIAN/UN-CEFACT para "unidad de servicio", según
          // soporte de Dataico (2026-09-23) — no "UND".
          "measuring-unit": "94",
          taxes: [
            {
              "tax-category": "IVA",
              "tax-rate": IVA_RATE,
              "tax-amount": iva,
              // "tax-base" no es el monto — es el % del ítem sujeto al
              // impuesto (100 = todo el ítem), tiene que estar entre 1 y
              // 100 (confirmado en pruebas, 2026-09-23). El monto real va
              // en "base-amount".
              "tax-base": 100,
              "base-amount": base,
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
