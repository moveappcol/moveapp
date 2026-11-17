import { describe, it, expect } from "vitest";
import { buildRegaloItemId, parseRegaloItemId, findCatalogItem } from "@/lib/orders";

describe("tarjeta de regalo en el catálogo", () => {
  it("un regalo viejo (solo el plan) sigue siendo 1 mes virtual", () => {
    expect(parseRegaloItemId("plan-starter")).toEqual({ planId: "plan-starter", meses: 1, fisica: false });
    expect(findCatalogItem("regalo", "plan-starter")?.price).toBe(209_900);
  });

  it("cobra plan × meses y suma $10.000 si es física", () => {
    const id = buildRegaloItemId({ planId: "plan-balance", meses: 3, fisica: true });
    expect(id).toBe("plan-balance-m3-fisica");
    const item = findCatalogItem("regalo", id)!;
    expect(item.price).toBe(384_900 * 3 + 10_000);
    expect(item.credits).toBe(64);
  });

  it("rechaza meses o planes que no existen", () => {
    expect(findCatalogItem("regalo", "plan-starter-m4")).toBeNull();
    expect(findCatalogItem("regalo", "plan-gratis-m2")).toBeNull();
  });
});
