import { describe, it, expect, vi, beforeEach } from "vitest";
import { fakeTable, fakeBase } from "./airtable-mock";

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

import { getAirtableBase } from "@/lib/airtable";
import { getGymById } from "@/lib/gyms";
import { getUserCreditsByEmail } from "@/lib/users";
import { getPruebaActivaByEmail } from "@/lib/pruebas";
import { getSubscriptionByEmail } from "@/lib/subscriptions";
import { createReservation } from "@/lib/reservations";

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

function setEmptyReservasBase() {
  (getAirtableBase as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
    fakeBase({ Reservas: fakeTable([]) })
  );
}

const paramsBase = {
  userEmail: "ana@test.com",
  userName: "Ana",
  claseId: "clase1",
  gimnasioId: "gym1",
  claseCredits: 5,
  fechaISO: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
};

describe("createReservation — Experiencias requieren plan activo", () => {
  beforeEach(() => vi.clearAllMocks());

  it("bloquea a quien solo tiene la Prueba activa", async () => {
    (getGymById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "gym1",
      name: "UNIQUE Experiencias",
      genero: "mixto",
      bookingCutoffMinutes: 60,
    });
    (getUserCreditsByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(fakeAccount());
    (getPruebaActivaByEmail as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "p1", estado: "Activa" });
    (getSubscriptionByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await createReservation(paramsBase);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("experiencia_requiere_plan");
  });

  it("bloquea a quien solo tiene créditos sueltos (sin Suscripcion Activa ni Prueba)", async () => {
    (getGymById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "gym1",
      name: "UNIQUE Experiencias",
      genero: "mixto",
      bookingCutoffMinutes: 60,
    });
    (getUserCreditsByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(fakeAccount());
    (getPruebaActivaByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (getSubscriptionByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await createReservation(paramsBase);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("experiencia_requiere_plan");
  });

  it("NO bloquea a un suscriptor real (Suscripcion Activa) en una Experiencia", async () => {
    setEmptyReservasBase();
    (getGymById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "gym1",
      name: "UNIQUE Experiencias",
      genero: "mixto",
      bookingCutoffMinutes: 60,
    });
    (getUserCreditsByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(fakeAccount());
    (getPruebaActivaByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (getSubscriptionByEmail as ReturnType<typeof vi.fn>).mockResolvedValue({ estado: "Activa", plan: "plan-starter" });

    const result = await createReservation(paramsBase);

    expect(result.ok).toBe(true);
  });

  it("NO bloquea una clase regular (gimnasio que no es de Experiencias), aunque sea solo Prueba", async () => {
    setEmptyReservasBase();
    (getGymById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "gym1",
      name: "Lucky Girl Pilates",
      genero: "mixto",
      bookingCutoffMinutes: 60,
    });
    (getUserCreditsByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(fakeAccount());
    (getPruebaActivaByEmail as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "p1", estado: "Activa" });
    (getSubscriptionByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await createReservation(paramsBase);

    expect(result.ok).toBe(true);
  });
});
