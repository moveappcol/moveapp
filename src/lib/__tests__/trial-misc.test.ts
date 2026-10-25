import { describe, it, expect, vi, beforeEach } from "vitest";
import { fakeRecord, fakeTable, fakeBase } from "./airtable-mock";

vi.mock("@/lib/airtable", () => ({
  getAirtableBase: vi.fn(),
  escapeFormulaValue: (v: string) => v,
}));

import { getAirtableBase } from "@/lib/airtable";
import { crearPrueba } from "@/lib/pruebas";
import { buildOcurrenciaCounts } from "@/lib/liquidaciones";

describe("los créditos de la Prueba UNIQUE vencen a los 7 días", () => {
  beforeEach(() => vi.clearAllMocks());

  it("FechaFin queda exactamente 7 días después de FechaInicio", async () => {
    const Pruebas = fakeTable([]);
    (getAirtableBase as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      fakeBase({ Pruebas })
    );

    const antes = Date.now();
    const prueba = await crearPrueba({
      correo: "ana@test.com",
      telefono: "3001234567",
      tarjetaHash: null,
      codigoReferido: null,
      pagoId: "pago1",
      paymentSourceId: 1,
      creditos: 16,
      aceptacionTexto: "texto legal",
      aceptacionIp: "1.2.3.4",
      aceptacionUserAgent: "ua",
    });
    const despues = Date.now();

    const duracionMs = new Date(prueba.fechaFin).getTime() - new Date(prueba.fechaInicio).getTime();
    const sieteDiasMs = 7 * 24 * 60 * 60 * 1000;
    expect(duracionMs).toBe(sieteDiasMs);
    // FechaInicio se tomó en el momento de la llamada, no antes ni después.
    expect(new Date(prueba.fechaInicio).getTime()).toBeGreaterThanOrEqual(antes);
    expect(new Date(prueba.fechaInicio).getTime()).toBeLessThanOrEqual(despues);
  });
});

describe("orden de vencimiento de créditos de distinto origen", () => {
  beforeEach(() => vi.clearAllMocks());

  it("una prueba (7 días) y un crédito de referido (30 días) vencen cada uno en su propia fecha, sin interferirse", async () => {
    // Ninguno de los dos sistemas rastrea "de qué crédito viene cada
    // unidad" dentro del saldo compartido (ver Context del plan) — cada
    // uno controla su propia fecha de vencimiento en su propia tabla
    // ("Pruebas" / "Referidos") y resta del mismo saldo cuando le toca,
    // mismo patrón en los dos. Esta prueba confirma que procesar el
    // vencimiento de uno no depende del otro ni lo toca.
    const pruebaVencida = fakeRecord("p1", {
      Correo: "ana@test.com",
      Estado: "Cancelada",
      FechaFin: new Date(Date.now() - 60_000).toISOString(), // venció hace 1 min
      CreditosOtorgados: 16,
    });
    const usuario = fakeRecord("u1", { Correo: "ana@test.com", Creditos: 21 }); // 16 prueba + 5 referido
    const usuarios = fakeTable([usuario]);
    const { expirarCreditosDePruebasVencidas } = await import("@/lib/pruebas");

    (getAirtableBase as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      fakeBase({ Pruebas: fakeTable([pruebaVencida]), usuarios })
    );

    const { procesados } = await expirarCreditosDePruebasVencidas();

    expect(procesados).toBe(1);
    // Solo vencieron los 16 de la prueba (que ya pasó su FechaFin) — los 5
    // de referido (que todavía no llegan a sus 30 días) quedan intactos,
    // porque ese vencimiento lo controla por separado
    // expirarCreditosReferidoVencidos en referidos.ts, con su propia
    // FechaExpira en su propia tabla, sin que esta corrida la toque.
    expect(usuarios.update).toHaveBeenCalledWith([{ id: "u1", fields: { Creditos: 5 } }]);
  });
});

describe("el pago a gimnasios sigue siendo 40%/30% del precio de lista, sin importar el origen del crédito", () => {
  it("buildOcurrenciaCounts no recibe ni usa el tipo de pago — mismo 40% para una reserva paga con prueba", () => {
    const reservas = [
      { estado: "Reservado", userName: "Ana (pagó con Prueba UNIQUE)" },
      { estado: "Reservado", userName: "Beto (pagó con plan Starter)" },
      { estado: "Cancelado on time", userName: "Caro (no cuenta)" },
    ];

    const counts = buildOcurrenciaCounts(reservas, /* claseCredits */ 8, "A", /* precioPorReserva */ 80_000);

    // 2 reservas confirmadas × $80.000 × 40% = $64.000, exactamente igual
    // sin importar que una se haya pagado con créditos de la prueba.
    expect(counts.reservasTipoA).toBe(2);
    expect(counts.totalTipoA).toBe(64_000);
    expect(counts.totalTipoB).toBe(0);
  });

  it("el mismo cálculo da 30% para un cupo Tipo B", () => {
    const reservas = [{ estado: "Reservado", userName: "Ana (pagó con Prueba UNIQUE)" }];

    const counts = buildOcurrenciaCounts(reservas, 8, "B", 80_000);

    expect(counts.totalTipoB).toBe(24_000); // 1 × 80.000 × 30%
    expect(counts.totalTipoA).toBe(0);
  });
});
