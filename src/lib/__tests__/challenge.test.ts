import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fakeRecord, fakeTable, fakeBase } from "./airtable-mock";

vi.mock("@/lib/airtable", () => ({ getAirtableBase: vi.fn(), escapeFormulaValue: (v: string) => v }));
vi.mock("@/lib/subscriptions", () => ({ getSubscriptionByEmail: vi.fn() }));
vi.mock("@/lib/users", () => ({ getUserCreditsByEmail: vi.fn() }));
vi.mock("@/lib/gyms", () => ({
  getGymById: vi.fn(async (id: string) => ({ id, name: id === "gExp" ? "Experiencias" : `Gym ${id}` })),
  esGimnasioDeExperiencias: (n: string) => n.toLowerCase().includes("experiencia"),
}));
vi.mock("@/lib/classes", () => ({
  getClaseByIdBasic: vi.fn(async (id: string) => ({ id, actividad: { c1: "Boxing", c2: "Pilates", c3: "Hyrox", c4: "Boxing" }[id] ?? null })),
}));
vi.mock("@/lib/push", () => ({ sendPushNotification: vi.fn() }));
vi.mock("@/lib/email", () => ({ sendChallengeGanasteEmail: vi.fn().mockResolvedValue(undefined), sendPaseGratisPorVencerEmail: vi.fn() }));

import { getAirtableBase } from "@/lib/airtable";
import { getSubscriptionByEmail } from "@/lib/subscriptions";
import { getUserCreditsByEmail } from "@/lib/users";
import { sendChallengeGanasteEmail } from "@/lib/email";
import { evaluarChallenge } from "@/lib/challenge";

const CORREO = "ana@test.com";

function reserva(id: string, fecha: string, gimnasio: string, clase: string, estado = "Reservado") {
  return fakeRecord(id, { Correo: CORREO, Fecha: fecha, Gimnasios: [gimnasio], Clase: [clase], Estado: estado });
}

function montar({ reservas = [], referidos = [], rondas = [] as ReturnType<typeof fakeRecord>[] } = {}) {
  const tablas = {
    Reservas: fakeTable(reservas),
    Referidos: fakeTable(referidos),
    Challenge: fakeTable(rondas),
    PasesClaseGratis: fakeTable([]),
  };
  vi.mocked(getAirtableBase).mockReturnValue(fakeBase(tablas) as never);
  return tablas;
}

const rondaEnCurso = () =>
  fakeRecord("ronda1", { Correo: CORREO, Ronda: 1, Inicio: "2026-11-24T05:00:00.000Z", Estado: "En curso" });

describe("Challenge UNIQUE", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-12-01T20:00:00Z"));
    vi.mocked(getSubscriptionByEmail).mockResolvedValue({ estado: "Activa" } as never);
    vi.mocked(getUserCreditsByEmail).mockResolvedValue({ vencimiento: "2026-12-20", pushToken: null, nombre: "Ana" } as never);
  });
  afterEach(() => vi.useRealTimers());

  it("la Prueba UNIQUE y quien no tiene plan no tienen challenge", async () => {
    montar();
    vi.mocked(getSubscriptionByEmail).mockResolvedValueOnce({ estado: "Prueba" } as never);
    expect(await evaluarChallenge(CORREO)).toEqual({ disponible: false });
    vi.mocked(getSubscriptionByEmail).mockResolvedValueOnce(null);
    expect(await evaluarChallenge(CORREO)).toEqual({ disponible: false });
  });

  it("cuenta gimnasios y disciplinas distintos, ignora canceladas, futuras y lo de antes de la ronda", async () => {
    montar({
      rondas: [rondaEnCurso()],
      reservas: [
        reserva("r1", "2026-11-25T12:00:00Z", "g1", "c1"),
        reserva("r2", "2026-11-26T12:00:00Z", "g2", "c2"),
        reserva("r3", "2026-11-27T12:00:00Z", "g2", "c4"), // mismo gym y misma disciplina que r1
        reserva("r4", "2026-11-28T12:00:00Z", "g3", "c3", "Cancelado on time "),
        reserva("r5", "2026-11-20T12:00:00Z", "g4", "c3"), // antes del lanzamiento
        reserva("r6", "2026-12-05T12:00:00Z", "g5", "c3"), // todavía no pasa
      ],
    });
    const estado = await evaluarChallenge(CORREO);
    if (!estado.disponible) throw new Error("debería estar disponible");
    const por = Object.fromEntries(estado.retos.map((r) => [r.id, r.actual]));
    expect(por).toEqual({ gimnasios: 2, disciplinas: 2, experiencias: 0, referidos: 0 });
    expect(estado.completados).toBe(0);
  });

  it("al completar los 4 retos crea el pase de 7 días, avisa y arranca una ronda nueva", async () => {
    const tablas = montar({
      rondas: [rondaEnCurso()],
      reservas: [
        reserva("r1", "2026-11-25T12:00:00Z", "g1", "c1"),
        reserva("r2", "2026-11-26T12:00:00Z", "g2", "c2"),
        reserva("r3", "2026-11-27T12:00:00Z", "g3", "c3"),
        reserva("r4", "2026-11-29T14:00:00Z", "gExp", "cx"),
      ],
      referidos: [fakeRecord("ref1", { ReferenteCorreo: CORREO, FechaOtorgado: "2026-11-28" })],
    });
    const estado = await evaluarChallenge(CORREO);
    if (!estado.disponible) throw new Error("debería estar disponible");

    expect(tablas.Challenge.update.mock.calls[0][0][0].fields.Estado).toBe("Completada");
    const pase = tablas.PasesClaseGratis.create.mock.calls[0][0][0].fields;
    expect(pase).toMatchObject({ FechaGanado: "2026-12-01", FechaVence: "2026-12-08", Estado: "Disponible" });
    expect(tablas.Challenge.create.mock.calls[0][0][0].fields).toMatchObject({ Ronda: 2, Estado: "En curso" });
    expect(sendChallengeGanasteEmail).toHaveBeenCalled();
    expect(estado.ronda).toBe(2);
    expect(estado.completados).toBe(0);
  });

  it("si se le vencieron los créditos hace más de 5 días sin pagar, se reinicia", async () => {
    const tablas = montar({ rondas: [rondaEnCurso()] });
    vi.mocked(getSubscriptionByEmail).mockResolvedValue({ estado: "Cancelada" } as never);
    vi.mocked(getUserCreditsByEmail).mockResolvedValue({ vencimiento: "2026-11-24" } as never);
    expect(await evaluarChallenge(CORREO)).toEqual({ disponible: false });
    expect(tablas.Challenge.update.mock.calls[0][0][0].fields.Estado).toBe("Reiniciada");
  });

  it("dentro de los 5 días de gracia queda congelado, sin reiniciar", async () => {
    const tablas = montar({ rondas: [rondaEnCurso()] });
    vi.mocked(getSubscriptionByEmail).mockResolvedValue({ estado: "Pago fallido" } as never);
    vi.mocked(getUserCreditsByEmail).mockResolvedValue({ vencimiento: "2026-11-28" } as never);
    const estado = await evaluarChallenge(CORREO);
    expect(estado).toMatchObject({ disponible: true, congelado: true });
    expect(tablas.Challenge.update).not.toHaveBeenCalled();
  });
});
