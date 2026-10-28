import { describe, it, expect, vi, beforeEach } from "vitest";
import { fakeRecord, fakeTable, fakeBase, type FakeTable } from "./airtable-mock";

vi.mock("@/lib/airtable", () => ({
  getAirtableBase: vi.fn(),
  escapeFormulaValue: (v: string) => v,
}));
vi.mock("@/lib/subscriptions", () => ({ setPruebaSubscriptionEstado: vi.fn() }));

import { getAirtableBase } from "@/lib/airtable";
import { setPruebaSubscriptionEstado } from "@/lib/subscriptions";
import {
  esElegibleParaPrueba,
  getDuePruebas,
  cancelarPrueba,
  reactivarPrueba,
  expirarCreditosDePruebasVencidas,
} from "@/lib/pruebas";

function setBase(tables: { Pagos?: FakeTable; Prueba?: FakeTable; usuarios?: FakeTable }) {
  const full = {
    Pagos: tables.Pagos ?? fakeTable([]),
    Prueba: tables.Prueba ?? fakeTable([]),
    usuarios: tables.usuarios ?? fakeTable([]),
  };
  (getAirtableBase as unknown as ReturnType<typeof vi.fn>).mockReturnValue(fakeBase(full));
  return full;
}

describe("esElegibleParaPrueba", () => {
  beforeEach(() => vi.clearAllMocks());

  it("bloquea si la cuenta ya tuvo cualquier pago aprobado antes", async () => {
    setBase({
      Pagos: fakeTable([fakeRecord("pago1", { Correo: "ana@test.com", Estado: "Aprobado" })]),
    });

    const result = await esElegibleParaPrueba("ana@test.com", "3001234567");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/solo para nuevos usuarios/i);
  });

  it("bloquea si el teléfono ya se usó en otra prueba (aunque sea otra cuenta)", async () => {
    setBase({
      Pagos: fakeTable([]),
      Prueba: fakeTable([fakeRecord("prueba1", { Correo: "otra@test.com", Telefono: "3001234567" })]),
    });

    const result = await esElegibleParaPrueba("nueva@test.com", "3001234567");

    expect(result.ok).toBe(false);
  });

  it("permite la prueba a una cuenta nueva, sin historial", async () => {
    setBase({ Pagos: fakeTable([]), Prueba: fakeTable([]) });

    const result = await esElegibleParaPrueba("nueva@test.com", "3009999999");

    expect(result.ok).toBe(true);
  });
});

describe("cancelarPrueba / reactivarPrueba", () => {
  beforeEach(() => vi.clearAllMocks());

  it("cancela una prueba activa y vigente", async () => {
    const pruebaRecord = fakeRecord("p1", {
      Correo: "ana@test.com",
      Estado: "Activa",
      FechaFin: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      CreditosOtorgados: 16,
    });
    const { Prueba } = setBase({ Prueba: fakeTable([pruebaRecord]) });

    const ok = await cancelarPrueba("ana@test.com");

    expect(ok).toBe(true);
    expect(Prueba.update).toHaveBeenCalledWith(
      [{ id: "p1", fields: { Estado: "Cancelada" } }],
      expect.anything()
    );
    expect(setPruebaSubscriptionEstado).toHaveBeenCalledWith("ana@test.com", "Cancelada");
  });

  it("no cancela una prueba que ya venció", async () => {
    const pruebaRecord = fakeRecord("p1", {
      Correo: "ana@test.com",
      Estado: "Activa",
      FechaFin: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      CreditosOtorgados: 16,
    });
    setBase({ Prueba: fakeTable([pruebaRecord]) });

    const ok = await cancelarPrueba("ana@test.com");

    expect(ok).toBe(false);
  });

  it("reactiva una prueba cancelada mientras siga vigente", async () => {
    const pruebaRecord = fakeRecord("p1", {
      Correo: "ana@test.com",
      Estado: "Cancelada",
      FechaFin: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      CreditosOtorgados: 16,
    });
    const { Prueba } = setBase({ Prueba: fakeTable([pruebaRecord]) });

    const ok = await reactivarPrueba("ana@test.com");

    expect(ok).toBe(true);
    expect(Prueba.update).toHaveBeenCalledWith(
      [{ id: "p1", fields: { Estado: "Activa" } }],
      expect.anything()
    );
    expect(setPruebaSubscriptionEstado).toHaveBeenCalledWith("ana@test.com", "Prueba");
  });
});

describe("getDuePruebas", () => {
  beforeEach(() => vi.clearAllMocks());

  it("incluye una prueba activa cuya FechaFin ya pasó, sin reintento pendiente", async () => {
    const vencida = fakeRecord("p1", {
      Correo: "ana@test.com",
      Estado: "Activa",
      FechaFin: new Date(Date.now() - 60_000).toISOString(),
      CreditosOtorgados: 16,
    });
    setBase({ Prueba: fakeTable([vencida]) });

    const due = await getDuePruebas();

    expect(due.map((p) => p.id)).toEqual(["p1"]);
  });

  it("excluye una prueba activa que todavía no vence", async () => {
    const vigente = fakeRecord("p1", {
      Correo: "ana@test.com",
      Estado: "Activa",
      FechaFin: new Date(Date.now() + 60_000).toISOString(),
      CreditosOtorgados: 16,
    });
    setBase({ Prueba: fakeTable([vigente]) });

    const due = await getDuePruebas();

    expect(due).toHaveLength(0);
  });

  it("excluye una prueba vencida que está esperando su reintento de 24h", async () => {
    const esperandoReintento = fakeRecord("p1", {
      Correo: "ana@test.com",
      Estado: "Activa",
      FechaFin: new Date(Date.now() - 60_000).toISOString(),
      IntentoReintento: true,
      ProximoReintento: new Date(Date.now() + 60_000).toISOString(),
      CreditosOtorgados: 16,
    });
    setBase({ Prueba: fakeTable([esperandoReintento]) });

    const due = await getDuePruebas();

    expect(due).toHaveLength(0);
  });

  it("incluye una prueba vencida cuyo reintento ya llegó", async () => {
    const reintentoListo = fakeRecord("p1", {
      Correo: "ana@test.com",
      Estado: "Activa",
      FechaFin: new Date(Date.now() - 60_000).toISOString(),
      IntentoReintento: true,
      ProximoReintento: new Date(Date.now() - 1_000).toISOString(),
      CreditosOtorgados: 16,
    });
    setBase({ Prueba: fakeTable([reintentoListo]) });

    const due = await getDuePruebas();

    expect(due.map((p) => p.id)).toEqual(["p1"]);
  });
});

describe("expirarCreditosDePruebasVencidas", () => {
  beforeEach(() => vi.clearAllMocks());

  it("vence (resta) los créditos sobrantes de una prueba cancelada que ya llegó a FechaFin", async () => {
    const cancelada = fakeRecord("p1", {
      Correo: "ana@test.com",
      Estado: "Cancelada",
      FechaFin: new Date(Date.now() - 60_000).toISOString(),
      CreditosOtorgados: 16,
    });
    const usuario = fakeRecord("u1", { Correo: "ana@test.com", Creditos: 10 });
    const { usuarios, Prueba } = setBase({
      Prueba: fakeTable([cancelada]),
      usuarios: fakeTable([usuario]),
    });

    const { procesados } = await expirarCreditosDePruebasVencidas();

    expect(procesados).toBe(1);
    // deductCreditsByEmail resta los 16 originales, con piso en 0 — no los
    // 10 que de verdad le quedaban, mismo criterio que
    // expirarCreditosReferidoVencidos en referidos.ts.
    expect(usuarios.update).toHaveBeenCalledWith([{ id: "u1", fields: { Creditos: 0 } }]);
    expect(Prueba.update).toHaveBeenCalledWith(
      [{ id: "p1", fields: { CreditosVencidos: true } }],
      expect.anything()
    );
  });

  it("no vuelve a vencer una prueba ya marcada CreditosVencidos (idempotente)", async () => {
    // La fórmula del select ya filtra NOT({CreditosVencidos}) — el mock
    // simplemente no incluye ninguna fila para simular que Airtable no
    // devolvió nada.
    const { Prueba } = setBase({ Prueba: fakeTable([]) });

    const { procesados } = await expirarCreditosDePruebasVencidas();

    expect(procesados).toBe(0);
    expect(Prueba.update).not.toHaveBeenCalled();
  });
});
