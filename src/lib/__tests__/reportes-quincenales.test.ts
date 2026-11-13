import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/airtable", () => ({ getAirtableBase: vi.fn(), escapeFormulaValue: (v: string) => v }));

import { periodosDeReporte } from "@/lib/reportes-quincenales";

describe("periodosDeReporte — un reporte por corte de pago", () => {
  it("antes del 13 no toca nada", () => {
    expect(periodosDeReporte(2026, 11, 12)).toEqual([]);
  });

  it("el 13 manda UN solo periodo: del 28 del mes anterior al 13", () => {
    expect(periodosDeReporte(2026, 11, 13)).toEqual([
      {
        desde: "2026-10-28",
        hasta: "2026-11-13",
        periodo: "28 de octubre al 13 de noviembre de 2026",
        key: "2026-10-28_2026-11-13",
      },
    ]);
  });

  it("cruce de año: 28 de diciembre al 13 de enero", () => {
    const [p] = periodosDeReporte(2027, 1, 13);
    expect(p.desde).toBe("2026-12-28");
    expect(p.hasta).toBe("2027-01-13");
    expect(p.periodo).toBe("28 de diciembre de 2026 al 13 de enero de 2027");
  });

  it("desde el 27 se suma el corte del 14 al 27 (el del 13 sigue pendiente si no se mandó)", () => {
    const ps = periodosDeReporte(2026, 11, 27);
    expect(ps.map((p) => p.key)).toEqual(["2026-10-28_2026-11-13", "2026-11-14_2026-11-27"]);
  });
});
