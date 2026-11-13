import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/airtable", () => ({ getAirtableBase: vi.fn(), escapeFormulaValue: (v: string) => v }));

import { deduplicarDetalle } from "@/lib/liquidaciones";

const nums = (n: number) =>
  JSON.stringify({
    reservasConfirmadas: n,
    creditosTotales: n * 8,
    reservasTipoA: n,
    reservasTipoB: 0,
    totalTipoA: n * 30000,
    totalTipoB: 0,
    totalAPagar: n * 30000,
  });

describe("deduplicarDetalle — misma clase guardada con NBSP y con espacio normal", () => {
  it("cuenta la ocurrencia una sola vez (gana el bloque más reciente)", () => {
    const detalle = [
      `[[Reformer Pilates (6:05 p. m.)@2026-10-27T23:05:00.000Z]]\n${nums(1)}\nversión vieja`,
      `[[Hot Barre (6:00 a. m.)@2026-10-20T11:00:00.000Z]]\n${nums(1)}\notra clase`,
      `[[Reformer Pilates (6:05 p. m.)@2026-10-27T23:05:00.000Z]]\n${nums(2)}\nversión nueva`,
    ].join("\n\n");

    const { detalle: limpio, numeros } = deduplicarDetalle(detalle);

    expect(numeros.reservasConfirmadas).toBe(3);
    expect(numeros.totalAPagar).toBe(90000);
    expect(limpio).toContain("versión nueva");
    expect(limpio).not.toContain("versión vieja");
    expect(limpio.match(/\[\[/g)).toHaveLength(2);
  });

  it("no toca un detalle sin duplicados", () => {
    const detalle = `[[Hyrox (6:30 p. m.)@2026-11-05T23:30:00.000Z]]\n${nums(1)}\nHyrox`;
    expect(deduplicarDetalle(detalle).numeros.reservasConfirmadas).toBe(1);
  });
});
