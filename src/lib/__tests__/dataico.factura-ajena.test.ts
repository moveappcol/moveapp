import { describe, it, expect, vi, beforeEach } from "vitest";

// El texto que "trae" el PDF de la factura — cada test lo cambia para
// simular qué factura devolvió Dataico de verdad.
let textoPdf = "";
vi.mock("unpdf", () => ({
  getDocumentProxy: vi.fn().mockResolvedValue({}),
  extractText: vi.fn(async () => ({ text: textoPdf })),
}));

import { createElectronicInvoice } from "@/lib/dataico";

const PARAMS = {
  numero: 37,
  sku: "plan-balance",
  concepto: "Suscripción UNIQUE — Plan Balance",
  totalConIva: 384_900,
  correo: "mariana@test.com",
  nombre: "Mariana",
  apellido: "Escobar",
  tipoDocumento: "Cédula de ciudadanía" as const,
  cedula: "1136885011",
  telefono: "3107778430",
};

function mockDataico(respuestaPost: { status: number; body: unknown }) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (url.includes("serve-file")) {
        return new Response(new Uint8Array([1, 2, 3]), { status: 200 });
      }
      return new Response(JSON.stringify(respuestaPost.body), { status: respuestaPost.status });
    })
  );
}

const OK_DATAICO = {
  status: 201,
  body: { uuid: "u1", pdf_url: "https://app.dataico.com/serve-file?document-id=u1", cufe: "cufe1" },
};

describe("createElectronicInvoice — nunca devuelve la factura de otra persona", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    process.env.DATAICO_API_KEY = "test";
  });

  it("acepta la factura si el PDF tiene el número pedido y la cédula del comprador", async () => {
    mockDataico(OK_DATAICO);
    textoPdf = "Razón Social Mariana Escobar CC 1136885011 ... Factura Electrónica de Venta UNQ - 37";

    const result = await createElectronicInvoice(PARAMS);

    expect(result).toEqual({ ok: true, uuid: "u1", pdfUrl: OK_DATAICO.body.pdf_url, cufe: "cufe1" });
  });

  it("rechaza si Dataico devuelve una factura vieja con otro número (número ya usado)", async () => {
    mockDataico(OK_DATAICO);
    textoPdf = "Razón Social Juliana Sánchez CC 1020829954 ... Factura Electrónica de Venta UNQ - 34";

    const result = await createElectronicInvoice(PARAMS);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.numeroOcupado).toBe(true);
  });

  it("rechaza si el número coincide pero la factura es de otra cédula (lo que le pasó a Mariana)", async () => {
    mockDataico(OK_DATAICO);
    textoPdf = "Razón Social Juliana Sánchez CC 1020829954 ... Factura Electrónica de Venta UNQ - 37";

    const result = await createElectronicInvoice(PARAMS);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.numeroOcupado).toBe(true);
  });

  it("no da por buena una cédula que solo aparece como parte de otro número", async () => {
    mockDataico(OK_DATAICO);
    textoPdf = "CC 91136885011 ... UNQ - 37";

    const result = await createElectronicInvoice(PARAMS);

    expect(result.ok).toBe(false);
  });

  it("si no puede leer el PDF, no la da por buena (mejor avisar que mandar algo sin verificar)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        url.includes("serve-file")
          ? new Response("", { status: 500 })
          : new Response(JSON.stringify(OK_DATAICO.body), { status: 201 })
      )
    );

    const result = await createElectronicInvoice(PARAMS);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.numeroOcupado).toBeFalsy();
  });

  it("marca numeroOcupado si Dataico rechaza señalando el campo number", async () => {
    mockDataico({ status: 422, body: { errors: { number: ["ya fue usado"] } } });

    const result = await createElectronicInvoice(PARAMS);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.numeroOcupado).toBe(true);
  });
});
