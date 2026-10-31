import { describe, it, expect, vi, beforeEach } from "vitest";
import { fakeRecord, fakeTable, fakeBase } from "./airtable-mock";

vi.mock("@/lib/airtable", () => ({
  getAirtableBase: vi.fn(),
  escapeFormulaValue: (v: string) => v,
}));
vi.mock("@/lib/users", () => ({ addCreditsByEmail: vi.fn() }));
vi.mock("@/lib/cupones", () => ({
  validateCoupon: vi.fn(),
  redeemFreeCouponForEmail: vi.fn(),
}));
vi.mock("@/lib/subscriptions", () => ({
  getSubscriptionByEmail: vi.fn(),
  upsertSubscription: vi.fn(),
}));

import { getAirtableBase } from "@/lib/airtable";
import { getSubscriptionByEmail, upsertSubscription } from "@/lib/subscriptions";
import { validateCoupon, redeemFreeCouponForEmail } from "@/lib/cupones";
import { canjearRegalo } from "@/lib/regalos";

function regaloRecord() {
  const hoy = new Date().toISOString().slice(0, 10);
  const limite = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return fakeRecord("reg1", {
    Codigo: "ABCD-1234",
    Plan: "plan-starter",
    CompradoPorCorreo: "ana@test.com",
    CompradoPorNombre: "Ana",
    PagoId: "pago1",
    FechaCompra: hoy,
    FechaLimite: limite,
    Estado: "Sin activar",
  });
}

describe("canjearRegalo — visibilidad en Suscripciones", () => {
  beforeEach(() => vi.clearAllMocks());

  it("un regalo de plan pagado queda en Suscripciones como Cancelada si no tenía plan real", async () => {
    (getAirtableBase as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      fakeBase({ Regalos: fakeTable([regaloRecord()]) })
    );
    (getSubscriptionByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await canjearRegalo("ABCD-1234", "pepe@test.com");

    expect(result.ok).toBe(true);
    expect(upsertSubscription).toHaveBeenCalledWith(
      expect.objectContaining({ correo: "pepe@test.com", plan: "plan-starter", estado: "Cancelada" })
    );
  });

  it("no toca Suscripciones si la persona ya tiene un plan real Activa (no la cancela sin querer)", async () => {
    (getAirtableBase as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      fakeBase({ Regalos: fakeTable([regaloRecord()]) })
    );
    (getSubscriptionByEmail as ReturnType<typeof vi.fn>).mockResolvedValue({
      estado: "Activa",
      plan: "plan-balance",
    });

    const result = await canjearRegalo("ABCD-1234", "pepe@test.com");

    expect(result.ok).toBe(true);
    expect(upsertSubscription).not.toHaveBeenCalled();
  });

  it("un cupón de créditos gratis (no pagado) nunca toca Suscripciones", async () => {
    (getAirtableBase as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      fakeBase({ Regalos: fakeTable([]) })
    );
    (validateCoupon as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      cupon: { recordId: "c1", codigo: "REGALO8", tipo: "Créditos gratis", creditos: 8 },
    });
    (redeemFreeCouponForEmail as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, credits: 8 });

    const result = await canjearRegalo("REGALO8", "pepe@test.com");

    expect(result.ok).toBe(true);
    expect(upsertSubscription).not.toHaveBeenCalled();
    expect(getSubscriptionByEmail).not.toHaveBeenCalled();
  });
});
