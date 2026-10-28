import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/wompi", () => ({ chargeWithPaymentSource: vi.fn() }));
vi.mock("@/lib/pagos", () => ({
  createPendingPago: vi.fn().mockResolvedValue("pago1"),
  updatePagoEstado: vi.fn(),
  updatePagoFactura: vi.fn(),
  claimPagoAprobado: vi.fn().mockResolvedValue(true),
  reserveNextFacturaNumero: vi.fn().mockResolvedValue(1),
  reserveNextNotaCreditoNumero: vi.fn().mockResolvedValue(1),
}));
vi.mock("@/lib/users", () => ({
  addCreditsByEmail: vi.fn(),
  deductCreditsByEmail: vi.fn(),
  getUserCreditsByEmail: vi.fn().mockResolvedValue(null),
}));
vi.mock("@/lib/dataico", () => ({
  createElectronicInvoice: vi.fn().mockResolvedValue({ ok: true, pdfUrl: "http://x", cufe: "c" }),
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
vi.mock("@/lib/pruebas", () => ({
  crearPrueba: vi.fn().mockResolvedValue({ id: "p1", fechaFin: "2026-11-01T00:00:00.000Z" }),
}));
vi.mock("@/lib/subscriptions", () => ({ upsertSubscription: vi.fn(), trackPruebaSubscription: vi.fn() }));

import { chargeWithPaymentSource } from "@/lib/wompi";
import { claimPagoAprobado } from "@/lib/pagos";
import { addCreditsByEmail, deductCreditsByEmail } from "@/lib/users";
import { procesarReferido } from "@/lib/referidos";
import { upsertSubscription, trackPruebaSubscription } from "@/lib/subscriptions";
import { crearPrueba } from "@/lib/pruebas";
import { chargeTrial, convertirPruebaAStarter } from "@/lib/billing";
import type { Prueba } from "@/lib/pruebas";

function fakePrueba(overrides: Partial<Prueba> = {}): Prueba {
  return {
    id: "p1",
    correo: "ana@test.com",
    telefono: "3001234567",
    tarjetaHash: null,
    codigoReferido: null,
    pagoId: "pago-original",
    paymentSourceId: 42,
    fechaInicio: "2026-10-18T00:00:00.000Z",
    fechaFin: "2026-10-25T00:00:00.000Z",
    creditosOtorgados: 16,
    estado: "Activa",
    intentoReintento: false,
    proximoReintento: null,
    creditosVencidos: false,
    ...overrides,
  };
}

describe("chargeTrial", () => {
  beforeEach(() => vi.clearAllMocks());

  it("acredita 16 créditos SIN extender Vencimiento y crea la fila en Pruebas", async () => {
    (chargeWithPaymentSource as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "tx1",
      status: "APPROVED",
      reference: "ref1",
      amountInCents: 6_900_000,
    });

    const result = await chargeTrial({
      correo: "ana@test.com",
      telefono: "3001234567",
      paymentSourceId: 42,
      ownerRef: "user_123",
      aceptacionTexto: "texto legal",
      aceptacionIp: "1.2.3.4",
      aceptacionUserAgent: "ua",
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.credits).toBe(16);
    // false = no extiende Vencimiento (vive en "Pruebas", no en el campo
    // compartido) — a diferencia de un plan o un regalo.
    expect(addCreditsByEmail).toHaveBeenCalledWith("ana@test.com", 16, false);
    expect(crearPrueba).toHaveBeenCalledWith(
      expect.objectContaining({ correo: "ana@test.com", creditos: 16 })
    );
    // Queda visible en "Suscripciones" (Estado "Prueba") para seguimiento,
    // sin tocar upsertSubscription (eso solo pasa al convertir a Starter).
    expect(trackPruebaSubscription).toHaveBeenCalledWith(
      expect.objectContaining({ correo: "ana@test.com", paymentSourceId: 42 })
    );
    expect(upsertSubscription).not.toHaveBeenCalled();
  });
});

describe("convertirPruebaAStarter — prueba sin cancelar", () => {
  beforeEach(() => vi.clearAllMocks());

  it("cobra el Starter y activa 32 créditos, venciendo antes los sobrantes de la prueba", async () => {
    (chargeWithPaymentSource as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "tx2",
      status: "APPROVED",
      reference: "ref2",
      amountInCents: 20_990_000,
    });

    const result = await convertirPruebaAStarter(fakePrueba());

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.credits).toBe(32);
    // Orden importa: primero se vencen los créditos sobrantes de la
    // prueba (16, el monto original otorgado), luego se suman los 32 del
    // Starter — nunca pasan créditos de la prueba al plan nuevo.
    const ordenDeduct = (deductCreditsByEmail as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0];
    const ordenAdd = (addCreditsByEmail as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0];
    expect(deductCreditsByEmail).toHaveBeenCalledWith("ana@test.com", 16);
    expect(addCreditsByEmail).toHaveBeenCalledWith("ana@test.com", 32, true);
    expect(ordenDeduct).toBeLessThan(ordenAdd);
    expect(upsertSubscription).toHaveBeenCalledWith(
      expect.objectContaining({ correo: "ana@test.com", plan: "plan-starter" })
    );
  });

  it("procesa el código de referido guardado en la prueba, solo al convertir (no al comprar la prueba)", async () => {
    (chargeWithPaymentSource as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "tx3",
      status: "APPROVED",
      reference: "ref3",
      amountInCents: 20_990_000,
    });

    await convertirPruebaAStarter(fakePrueba({ codigoReferido: "AMIGO1" }));

    expect(procesarReferido).toHaveBeenCalledWith(
      expect.objectContaining({ correoReferido: "ana@test.com", codigo: "AMIGO1" })
    );
  });

  it("si Wompi rechaza el cobro, no acredita nada y no toca la suscripción", async () => {
    (chargeWithPaymentSource as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "tx4",
      status: "DECLINED",
      reference: "ref4",
      amountInCents: 20_990_000,
    });

    const result = await convertirPruebaAStarter(fakePrueba());

    expect(result.ok).toBe(false);
    expect(addCreditsByEmail).not.toHaveBeenCalled();
    expect(upsertSubscription).not.toHaveBeenCalled();
  });

  it("no acredita dos veces si claimPagoAprobado ya lo había reclamado (idempotencia del pago)", async () => {
    (chargeWithPaymentSource as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "tx5",
      status: "APPROVED",
      reference: "ref5",
      amountInCents: 20_990_000,
    });
    (claimPagoAprobado as ReturnType<typeof vi.fn>).mockResolvedValue(false);

    const result = await convertirPruebaAStarter(fakePrueba());

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.credited).toBe(false);
    expect(addCreditsByEmail).not.toHaveBeenCalled();
    expect(deductCreditsByEmail).not.toHaveBeenCalled();
  });
});
