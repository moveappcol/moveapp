import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/airtable", () => ({ getAirtableBase: vi.fn(), escapeFormulaValue: (v: string) => v }));

import { validarDatosTarjetaRegalo } from "@/lib/regalos";

describe("validarDatosTarjetaRegalo", () => {
  it("pide para quién y de parte de quién", () => {
    expect(validarDatosTarjetaRegalo({ para: "Ana", deParte: "" }, false).ok).toBe(false);
    expect(validarDatosTarjetaRegalo({ para: "Ana", deParte: "Paula" }, false).ok).toBe(true);
  });

  it("la física solo se envía en Bogotá y pide dirección y celular", () => {
    const base = { para: "Ana", deParte: "Paula", direccion: "Cra 1 # 2-3", celular: "300 123 4567" };
    expect(validarDatosTarjetaRegalo({ ...base, ciudad: "Medellín" }, true).ok).toBe(false);
    expect(validarDatosTarjetaRegalo({ ...base, ciudad: "bogota", celular: "12" }, true).ok).toBe(false);
    const ok = validarDatosTarjetaRegalo({ ...base, ciudad: "Bogotá" }, true);
    expect(ok).toEqual({
      ok: true,
      datos: { para: "Ana", deParte: "Paula", envio: { ciudad: "Bogotá", direccion: "Cra 1 # 2-3", celular: "3001234567" } },
    });
  });
});
