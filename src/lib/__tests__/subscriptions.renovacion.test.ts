import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fakeTable, fakeBase } from "./airtable-mock";

vi.mock("@/lib/airtable", () => ({
  getAirtableBase: vi.fn(),
  escapeFormulaValue: (v: string) => v,
}));

import { getAirtableBase } from "@/lib/airtable";
import { markSubscriptionRenewed, type Subscription } from "@/lib/subscriptions";

function sub(proximoCobro: string): Subscription {
  return {
    id: "sub1",
    correo: "ana@test.com",
    plan: "plan-starter",
    paymentSourceId: 1,
    estado: "Activa",
    proximoCobro,
    planSiguiente: null,
  };
}

describe("markSubscriptionRenewed", () => {
  let tabla: ReturnType<typeof fakeTable>;

  beforeEach(() => {
    tabla = fakeTable();
    vi.mocked(getAirtableBase).mockReturnValue(fakeBase({ Suscripciones: tabla }) as never);
    vi.useFakeTimers({ toFake: ["Date"] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("si el cron cobra tarde, el próximo cobro queda un mes desde hoy (igual que el vencimiento de los créditos)", async () => {
    vi.setSystemTime(new Date("2026-10-27T13:00:00Z"));
    await markSubscriptionRenewed(sub("2026-10-15"));
    expect(tabla.update.mock.calls[0][0][0].fields.ProximoCobro).toBe("2026-11-27");
  });

  it("si cobra a tiempo, conserva el mismo día de cobro", async () => {
    vi.setSystemTime(new Date("2026-10-15T13:00:00Z"));
    await markSubscriptionRenewed(sub("2026-10-15"));
    expect(tabla.update.mock.calls[0][0][0].fields.ProximoCobro).toBe("2026-11-15");
  });
});
