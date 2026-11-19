import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/server-cache", () => ({ cached: (_k: string, _t: number, fn: () => unknown) => fn() }));

import { createPaymentSource, chargeWithPaymentSource } from "@/lib/wompi";

function respuesta(data: unknown) {
  return { ok: true, json: async () => ({ data }) } as Response;
}

describe("Wompi con Nequi", () => {
  beforeEach(() => {
    process.env.WOMPI_PRIVATE_KEY = "prv_test_x";
    process.env.WOMPI_INTEGRITY_SECRET = "test_integrity_x";
    process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY = "pub_test_x";
  });

  it("un token nequi_ se guarda como fuente de pago NEQUI", async () => {
    const fetchMock = vi.fn().mockResolvedValue(respuesta({ id: 3891, status: "AVAILABLE" }));
    vi.stubGlobal("fetch", fetchMock);
    await createPaymentSource({ cardToken: "nequi_test_abc", customerEmail: "a@b.co", acceptanceToken: "x", personalAuthToken: "y" });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).type).toBe("NEQUI");
  });

  it("al cobrar una fuente Nequi no se mandan cuotas; a una tarjeta sí", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(respuesta({ type: "NEQUI" }))
      .mockResolvedValueOnce(respuesta({ id: "tx1", status: "APPROVED", reference: "r", amount_in_cents: 100 }))
      .mockResolvedValueOnce(respuesta({ type: "CARD" }))
      .mockResolvedValueOnce(respuesta({ id: "tx2", status: "APPROVED", reference: "r", amount_in_cents: 100 }));
    vi.stubGlobal("fetch", fetchMock);

    await chargeWithPaymentSource({ amountInCents: 100, customerEmail: "a@b.co", paymentSourceId: 1, reference: "r" });
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).payment_method).toBeUndefined();

    await chargeWithPaymentSource({ amountInCents: 100, customerEmail: "a@b.co", paymentSourceId: 2, reference: "r" });
    expect(JSON.parse(fetchMock.mock.calls[3][1].body).payment_method).toEqual({ installments: 1 });
  });
});
