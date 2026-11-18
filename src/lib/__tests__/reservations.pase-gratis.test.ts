import { describe, it, expect, vi, beforeEach } from "vitest";
import { fakeRecord, fakeTable, fakeBase } from "./airtable-mock";

vi.mock("@/lib/airtable", () => ({
  getAirtableBase: vi.fn(),
  escapeFormulaValue: (v: string) => v,
}));
vi.mock("@/lib/gyms", () => ({
  getGymById: vi.fn(),
  getGymBillingInfo: vi.fn(),
  getGyms: vi.fn(),
  canAccessGymByGenero: () => true,
  esGimnasioDeExperiencias: (n: string) => n.toLowerCase().includes("experiencia"),
  DEFAULT_BOOKING_CUTOFF_MINUTES: 60,
  reservationsAreOpen: () => true,
  reservationsOpenLabel: () => "",
}));
vi.mock("@/lib/users", () => ({
  getUserCreditsByEmail: vi.fn(),
  deductCredits: vi.fn().mockResolvedValue(15),
  addCredits: vi.fn(),
}));
vi.mock("@/lib/pruebas", () => ({ getPruebaActivaByEmail: vi.fn().mockResolvedValue(null) }));
vi.mock("@/lib/subscriptions", () => ({ getSubscriptionByEmail: vi.fn().mockResolvedValue(null) }));
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
vi.mock("@/lib/challenge", () => ({
  getPaseDisponible: vi.fn(),
  marcarPaseUsado: vi.fn(),
  devolverPaseDeReserva: vi.fn(),
}));
vi.mock("@/lib/notificaciones", () => ({ crearNotificacion: vi.fn().mockResolvedValue(undefined) }));

import { getAirtableBase } from "@/lib/airtable";
import { getGymById } from "@/lib/gyms";
import { getUserCreditsByEmail } from "@/lib/users";
import { createReservation } from "@/lib/reservations";
import { getPaseDisponible, marcarPaseUsado } from "@/lib/challenge";
import { deductCredits } from "@/lib/users";

function fakeAccount(vencimiento: string | null = null) {
  return { recordId: "u1", credits: 20, cedula: "123", genero: null, pushToken: null, trackingConsent: true, vencimiento };
}

function reserva(fechaISO: string, estado = "Reservado") {
  return fakeRecord(`r-${fechaISO}`, {
    Usuario: "Ana",
    Gimnasios: ["gym1"],
    Fecha: fechaISO,
    Estado: estado,
  });
}

function daysFromNow(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

const gym = { id: "gym1", name: "Lucky Girl Pilates", genero: "mixto", bookingCutoffMinutes: 60 };

describe("Reservar con el pase de clase gratis del Challenge", () => {
  beforeEach(() => vi.clearAllMocks());

  it("no pide créditos, no los descuenta y marca el pase como usado", async () => {
    (getGymById as ReturnType<typeof vi.fn>).mockResolvedValue(gym);
    (getUserCreditsByEmail as ReturnType<typeof vi.fn>).mockResolvedValue({ ...fakeAccount(daysFromNow(20).slice(0, 10)), credits: 0 });
    vi.mocked(getPaseDisponible).mockResolvedValue({ id: "pase1", fechaVence: "2099-01-01" });
    const reservas = fakeTable([]);
    (getAirtableBase as unknown as ReturnType<typeof vi.fn>).mockReturnValue(fakeBase({ Reservas: reservas }));

    const result = await createReservation({
      userEmail: "ana@test.com",
      userName: "Ana",
      claseId: "clase1",
      gimnasioId: "gym1",
      claseCredits: 8,
      fechaISO: daysFromNow(2),
      usarPaseGratis: true,
    });

    expect(result.ok).toBe(true);
    expect(deductCredits).not.toHaveBeenCalled();
    expect(reservas.create.mock.calls[0][0][0].fields.PaseGratis).toBe(true);
    expect(marcarPaseUsado).toHaveBeenCalledWith("pase1", "new0");
  });

  it("sin pase vigente no deja reservar gratis", async () => {
    (getGymById as ReturnType<typeof vi.fn>).mockResolvedValue(gym);
    (getUserCreditsByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(fakeAccount(daysFromNow(20).slice(0, 10)));
    vi.mocked(getPaseDisponible).mockResolvedValue(null);
    (getAirtableBase as unknown as ReturnType<typeof vi.fn>).mockReturnValue(fakeBase({ Reservas: fakeTable([]) }));

    const result = await createReservation({
      userEmail: "ana@test.com",
      userName: "Ana",
      claseId: "clase1",
      gimnasioId: "gym1",
      claseCredits: 8,
      fechaISO: daysFromNow(2),
      usarPaseGratis: true,
    });

    expect(result).toMatchObject({ ok: false, code: "sin_pase_gratis" });
  });

  it("no sirve para Experiencias", async () => {
    (getGymById as ReturnType<typeof vi.fn>).mockResolvedValue({ ...gym, name: "Experiencias" });
    (getUserCreditsByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(fakeAccount(daysFromNow(20).slice(0, 10)));
    vi.mocked(getPaseDisponible).mockResolvedValue({ id: "pase1", fechaVence: "2099-01-01" });
    (getAirtableBase as unknown as ReturnType<typeof vi.fn>).mockReturnValue(fakeBase({ Reservas: fakeTable([]) }));

    const result = await createReservation({
      userEmail: "ana@test.com",
      userName: "Ana",
      claseId: "clase1",
      gimnasioId: "gym1",
      claseCredits: 8,
      fechaISO: daysFromNow(2),
      usarPaseGratis: true,
    });

    expect(result.ok).toBe(false);
  });
});
