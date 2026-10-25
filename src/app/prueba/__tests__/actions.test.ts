import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn().mockResolvedValue({ userId: "user_123" }),
  currentUser: vi.fn().mockResolvedValue({
    primaryEmailAddress: { emailAddress: "ana@test.com" },
  }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/meta-request-context", () => ({
  getMetaRequestContext: vi.fn().mockResolvedValue({
    clientIpAddress: "1.2.3.4",
    clientUserAgent: "test-agent",
    fbp: null,
    fbc: null,
  }),
}));
vi.mock("@/lib/wompi", () => ({
  fetchFreshAcceptanceTokens: vi.fn(),
  createPaymentSource: vi.fn(),
}));
vi.mock("@/lib/pruebas", () => ({
  esElegibleParaPrueba: vi.fn().mockResolvedValue({ ok: true }),
  TEXTO_ACEPTACION_PRUEBA: "texto legal",
}));
vi.mock("@/lib/billing", () => ({ chargeTrial: vi.fn() }));
vi.mock("@/lib/users", () => ({
  getUserCreditsByEmail: vi.fn().mockResolvedValue({ telefono: "3001234567" }),
}));

import { createPaymentSource, fetchFreshAcceptanceTokens } from "@/lib/wompi";
import { chargeTrial } from "@/lib/billing";
import { buyTrial } from "@/app/prueba/actions";

describe("buyTrial — casilla de aceptación obligatoria", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rechaza el pago si la casilla legal no está marcada, sin cobrar nada", async () => {
    const result = await buyTrial({ cardToken: "tok_test", aceptado: false });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/casilla/i);
    expect(createPaymentSource).not.toHaveBeenCalled();
    expect(chargeTrial).not.toHaveBeenCalled();
  });

  it("si la casilla está marcada, sigue el flujo y guarda el texto de aceptación exacto", async () => {
    (fetchFreshAcceptanceTokens as ReturnType<typeof vi.fn>).mockResolvedValue({
      acceptanceToken: "acc_tok",
      personalAuthToken: "auth_tok",
    });
    (createPaymentSource as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 999 });
    (chargeTrial as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      transactionId: "tx1",
      credits: 16,
      fechaFin: "2026-11-01T00:00:00.000Z",
      credited: true,
    });

    const result = await buyTrial({ cardToken: "tok_test", aceptado: true });

    expect(result.ok).toBe(true);
    expect(chargeTrial).toHaveBeenCalledWith(
      expect.objectContaining({
        correo: "ana@test.com",
        telefono: "3001234567",
        aceptacionTexto: "texto legal",
        aceptacionIp: "1.2.3.4",
        aceptacionUserAgent: "test-agent",
      })
    );
  });
});
