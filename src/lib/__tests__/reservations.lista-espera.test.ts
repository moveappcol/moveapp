import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/airtable", () => ({
  getAirtableBase: vi.fn(),
  escapeFormulaValue: (v: string) => v,
}));
vi.mock("@/lib/gyms", () => ({
  getGymById: vi.fn(),
  getGymBillingInfo: vi.fn(),
  getGyms: vi.fn(),
  canAccessGymByGenero: () => true,
  esGimnasioDeExperiencias: (nombre: string) => nombre.toLowerCase().includes("experiencia"),
  DEFAULT_BOOKING_CUTOFF_MINUTES: 60,
  reservationsAreOpen: () => true,
  reservationsOpenLabel: () => "",
}));
vi.mock("@/lib/users", () => ({
  getUserCreditsByEmail: vi.fn(),
  deductCredits: vi.fn().mockResolvedValue(15),
  addCredits: vi.fn(),
}));
vi.mock("@/lib/pruebas", () => ({ getPruebaActivaByEmail: vi.fn() }));
vi.mock("@/lib/subscriptions", () => ({ getSubscriptionByEmail: vi.fn() }));
vi.mock("@/lib/classes", () => ({
  getClaseById: vi.fn().mockResolvedValue(null),
  precioEfectivo: vi.fn(),
  invalidateClasesCupos: vi.fn(),
  getAllClasesDeTodosLosGimnasios: vi.fn(),
}));
vi.mock("@/lib/email", () => ({
  sendLowRatingAlertEmail: vi.fn(),
  sendNewReservationEmail: vi.fn().mockResolvedValue(undefined),
  sendWaitlistPromotedEmail: vi.fn(),
  sendCancelacionConAvisoEmail: vi.fn(),
  sendCancelacionTardiaEmail: vi.fn(),
}));
vi.mock("@/lib/waitlist", () => ({
  getWaitingInOrder: vi.fn().mockResolvedValue([]),
  markWaitlistPromoted: vi.fn(),
  markWaitlistDenied: vi.fn(),
  getAllWaitingEntries: vi.fn(),
}));
vi.mock("@/lib/push", () => ({ sendPushNotification: vi.fn() }));
vi.mock("@/lib/notificaciones", () => ({ crearNotificacion: vi.fn().mockResolvedValue(undefined) }));

import { getGymById } from "@/lib/gyms";
import { getUserCreditsByEmail } from "@/lib/users";
import { getPruebaActivaByEmail } from "@/lib/pruebas";
import { getSubscriptionByEmail } from "@/lib/subscriptions";
import { validarEntradaListaEspera } from "@/lib/reservations";

function fakeAccount() {
  return {
    recordId: "u1",
    credits: 20,
    cedula: "123",
    genero: null,
    pushToken: null,
    trackingConsent: true,
  };
}

const params = { userEmail: "ivanna@test.com", gimnasioId: "gym1", claseCredits: 5 };

describe("validarEntradaListaEspera — mismos requisitos que reservar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getGymById as ReturnType<typeof vi.fn>).mockResolvedValue({ name: "Zulu", genero: null });
    (getPruebaActivaByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (getSubscriptionByEmail as ReturnType<typeof vi.fn>).mockResolvedValue({ estado: "Activa" });
  });

  it("bloquea a quien se registró y no ha comprado nada (0 créditos)", async () => {
    (getUserCreditsByEmail as ReturnType<typeof vi.fn>).mockResolvedValue({ ...fakeAccount(), credits: 0 });
    const r = await validarEntradaListaEspera(params);
    expect(r).toMatchObject({ ok: false, code: "sin_creditos" });
  });

  it("bloquea si no alcanzan los créditos para esa clase", async () => {
    (getUserCreditsByEmail as ReturnType<typeof vi.fn>).mockResolvedValue({ ...fakeAccount(), credits: 4 });
    const r = await validarEntradaListaEspera(params);
    expect(r).toMatchObject({ ok: false, code: "sin_creditos" });
  });

  it("bloquea si no tiene cuenta de créditos", async () => {
    (getUserCreditsByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const r = await validarEntradaListaEspera(params);
    expect(r).toMatchObject({ ok: false, code: "sin_creditos" });
  });

  it("bloquea Experiencias sin plan mensual activo, aunque tenga créditos", async () => {
    (getUserCreditsByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(fakeAccount());
    (getGymById as ReturnType<typeof vi.fn>).mockResolvedValue({ name: "Experiencias", genero: null });
    (getSubscriptionByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const r = await validarEntradaListaEspera(params);
    expect(r).toMatchObject({ ok: false, code: "experiencia_requiere_plan" });
  });

  it("deja entrar a quien tiene créditos suficientes y perfil completo", async () => {
    (getUserCreditsByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(fakeAccount());
    const r = await validarEntradaListaEspera(params);
    expect(r).toEqual({ ok: true });
  });
});
