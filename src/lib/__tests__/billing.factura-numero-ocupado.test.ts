import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/wompi", () => ({ chargeWithPaymentSource: vi.fn() }));
vi.mock("@/lib/pagos", () => ({
  createPendingPago: vi.fn(),
  updatePagoEstado: vi.fn(),
  updatePagoFactura: vi.fn(),
  claimPagoAprobado: vi.fn(),
  reserveNextFacturaNumero: vi.fn(),
  reserveNextNotaCreditoNumero: vi.fn(),
}));
vi.mock("@/lib/users", () => ({
  addCreditsByEmail: vi.fn(),
  deductCreditsByEmail: vi.fn(),
  getUserCreditsByEmail: vi.fn().mockResolvedValue({
    nombre: "Mariana",
    apellido: "Escobar",
    tipoDocumento: "Cédula de ciudadanía",
    cedula: "1136885011",
    telefono: null,
  }),
}));
vi.mock("@/lib/dataico", () => ({
  createElectronicInvoice: vi.fn(),
  createCreditNote: vi.fn(),
  extractInvoiceUuidFromPdfUrl: vi.fn(),
}));
vi.mock("@/lib/email", () => ({
  sendOpsAlertEmail: vi.fn(),
  sendInvoiceEmail: vi.fn(),
  sendGiftPurchaseEmail: vi.fn(),
}));
vi.mock("@/lib/referidos", () => ({ procesarReferido: vi.fn() }));
vi.mock("@/lib/regalos", () => ({ crearRegalo: vi.fn() }));
vi.mock("@/lib/pruebas", () => ({ crearPrueba: vi.fn() }));
vi.mock("@/lib/subscriptions", () => ({ upsertSubscription: vi.fn(), trackPruebaSubscription: vi.fn() }));

import { reserveNextFacturaNumero, updatePagoFactura } from "@/lib/pagos";
import { createElectronicInvoice } from "@/lib/dataico";
import { sendInvoiceEmail, sendOpsAlertEmail } from "@/lib/email";
import { facturarCompra } from "@/lib/billing";

const COMPRA = {
  correo: "mariana@test.com",
  sku: "plan-balance",
  concepto: "Suscripción UNIQUE — Plan Balance",
  totalConIva: 384_900,
  pagoId: "pago1",
};

describe("facturarCompra — número de factura ya usado en Dataico", () => {
  beforeEach(() => vi.clearAllMocks());

  it("reserva el siguiente número y reintenta, y solo guarda/manda la factura correcta", async () => {
    (reserveNextFacturaNumero as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(34)
      .mockResolvedValueOnce(35);
    (createElectronicInvoice as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ ok: false, error: "ya estaba usado", numeroOcupado: true })
      .mockResolvedValueOnce({ ok: true, uuid: "u", pdfUrl: "pdf-correcto", cufe: "c" });

    await facturarCompra(COMPRA);

    expect(createElectronicInvoice).toHaveBeenCalledTimes(2);
    expect((createElectronicInvoice as ReturnType<typeof vi.fn>).mock.calls[1][0].numero).toBe(35);
    expect(updatePagoFactura).toHaveBeenCalledTimes(1);
    expect(updatePagoFactura).toHaveBeenCalledWith("pago1", { pdfUrl: "pdf-correcto", cufe: "c" });
    expect(sendInvoiceEmail).toHaveBeenCalledTimes(1);
    expect(sendInvoiceEmail).toHaveBeenCalledWith(expect.objectContaining({ pdfUrl: "pdf-correcto" }));
  });

  it("si falla por otra razón, no reintenta, no guarda ni manda nada al cliente, y avisa", async () => {
    (reserveNextFacturaNumero as ReturnType<typeof vi.fn>).mockResolvedValue(38);
    (createElectronicInvoice as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false, error: "otro error" });

    await facturarCompra(COMPRA);

    expect(createElectronicInvoice).toHaveBeenCalledTimes(1);
    expect(updatePagoFactura).not.toHaveBeenCalled();
    expect(sendInvoiceEmail).not.toHaveBeenCalled();
    expect(sendOpsAlertEmail).toHaveBeenCalledTimes(1);
  });

  it("deja de reintentar después de 10 números ocupados seguidos y avisa", async () => {
    (reserveNextFacturaNumero as ReturnType<typeof vi.fn>).mockResolvedValue(40);
    (createElectronicInvoice as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      error: "ya estaba usado",
      numeroOcupado: true,
    });

    await facturarCompra(COMPRA);

    expect(createElectronicInvoice).toHaveBeenCalledTimes(10);
    expect(sendInvoiceEmail).not.toHaveBeenCalled();
    expect(sendOpsAlertEmail).toHaveBeenCalledTimes(1);
  });
});
