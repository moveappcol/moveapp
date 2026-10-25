import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/pruebas", () => ({
  getDuePruebas: vi.fn(),
  marcarConvertida: vi.fn(),
  marcarCobroFallidoDefinitivo: vi.fn(),
  marcarReintentoProgramado: vi.fn(),
}));
vi.mock("@/lib/billing", () => ({ convertirPruebaAStarter: vi.fn() }));
vi.mock("@/lib/email", () => ({
  sendTrialConvertedEmail: vi.fn().mockResolvedValue(undefined),
  sendTrialPaymentFailedEmail: vi.fn().mockResolvedValue(undefined),
  sendOpsAlertEmail: vi.fn().mockResolvedValue(undefined),
}));

import {
  getDuePruebas,
  marcarConvertida,
  marcarCobroFallidoDefinitivo,
  marcarReintentoProgramado,
} from "@/lib/pruebas";
import { convertirPruebaAStarter } from "@/lib/billing";
import { GET } from "@/app/api/cron/convertir-pruebas/route";
import type { Prueba } from "@/lib/pruebas";

function fakeRequest() {
  return { headers: { get: () => `Bearer ${process.env.CRON_SECRET}` } } as unknown as Parameters<typeof GET>[0];
}

function fakePrueba(overrides: Partial<Prueba> = {}): Prueba {
  return {
    id: "p1",
    correo: "ana@test.com",
    telefono: null,
    tarjetaHash: null,
    codigoReferido: null,
    pagoId: "pago1",
    paymentSourceId: 1,
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

describe("cron convertir-pruebas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "test-secret";
  });

  it("primer cobro fallido programa el reintento de 24h, sin dejar la cuenta sin plan todavía", async () => {
    (getDuePruebas as ReturnType<typeof vi.fn>).mockResolvedValue([fakePrueba({ intentoReintento: false })]);
    (convertirPruebaAStarter as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false, error: "Pago declined." });

    const res = await GET(fakeRequest());
    const json = await res.json();

    expect(marcarReintentoProgramado).toHaveBeenCalledWith("p1", "Pago declined.");
    expect(marcarCobroFallidoDefinitivo).not.toHaveBeenCalled();
    expect(json.reintentosProgramados).toBe(1);
    expect(json.fallidasDefinitivas).toBe(0);
  });

  it("segundo cobro fallido (ya reintentado) deja la cuenta sin plan activo de forma definitiva", async () => {
    (getDuePruebas as ReturnType<typeof vi.fn>).mockResolvedValue([fakePrueba({ intentoReintento: true })]);
    (convertirPruebaAStarter as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false, error: "Pago declined de nuevo." });

    const res = await GET(fakeRequest());
    const json = await res.json();

    expect(marcarCobroFallidoDefinitivo).toHaveBeenCalledWith(
      expect.objectContaining({ id: "p1" }),
      "Pago declined de nuevo."
    );
    expect(json.fallidasDefinitivas).toBe(1);
  });

  it("conversión exitosa marca la prueba como Convertida", async () => {
    (getDuePruebas as ReturnType<typeof vi.fn>).mockResolvedValue([fakePrueba()]);
    (convertirPruebaAStarter as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      transactionId: "tx1",
      credits: 32,
      credited: true,
    });

    const res = await GET(fakeRequest());
    const json = await res.json();

    expect(marcarConvertida).toHaveBeenCalledWith("p1");
    expect(json.convertidas).toBe(1);
  });

  it("corrido dos veces no cobra dos veces: la segunda corrida no recibe pruebas ya resueltas", async () => {
    // Simula la realidad: una vez "Convertida"/"Cobro fallido", la prueba
    // ya no cumple {Estado}="Activa" y getDuePruebas() deja de devolverla —
    // así que una segunda corrida del cron simplemente no tiene nada que
    // reprocesar, sin necesidad de ningún candado extra.
    (getDuePruebas as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([fakePrueba()])
      .mockResolvedValueOnce([]);
    (convertirPruebaAStarter as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      transactionId: "tx1",
      credits: 32,
      credited: true,
    });

    await GET(fakeRequest());
    const segundaCorrida = await GET(fakeRequest());
    const json2 = await segundaCorrida.json();

    expect(convertirPruebaAStarter).toHaveBeenCalledTimes(1);
    expect(json2.processed).toBe(0);
  });
});
