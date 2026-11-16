import { describe, it, expect } from "vitest";
import { CREDIT_PLANS, esBlackFriday, creditosCompraPlan, bonoBlackFridayPorcentaje } from "@/lib/credits-pricing";

const [starter, balance, volume] = CREDIT_PLANS;

describe("Black Friday", () => {
  it("solo corre el 20 y 21 de nov hora Colombia", () => {
    expect(esBlackFriday(new Date("2026-11-19T23:59:00-05:00"))).toBe(false);
    expect(esBlackFriday(new Date("2026-11-20T00:00:00-05:00"))).toBe(true);
    expect(esBlackFriday(new Date("2026-11-21T23:59:00-05:00"))).toBe(true);
    expect(esBlackFriday(new Date("2026-11-22T00:00:00-05:00"))).toBe(false);
  });

  it("da +20% en Starter y +15% en Balance y Volume", () => {
    const viernes = new Date("2026-11-20T12:00:00-05:00");
    expect(creditosCompraPlan(starter, viernes)).toBe(38);
    expect(creditosCompraPlan(balance, viernes)).toBe(74);
    expect(creditosCompraPlan(volume, viernes)).toBe(115);
    expect(bonoBlackFridayPorcentaje(starter.id, viernes)).toBe(20);
  });

  it("fuera de las fechas da los créditos normales", () => {
    const lunes = new Date("2026-11-23T12:00:00-05:00");
    expect(creditosCompraPlan(starter, lunes)).toBe(32);
    expect(creditosCompraPlan(volume, lunes)).toBe(100);
  });
});
