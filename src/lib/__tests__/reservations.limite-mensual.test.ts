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
  esGimnasioDeExperiencias: () => false,
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
import { getSubscriptionByEmail } from "@/lib/subscriptions";
import { createReservation } from "@/lib/reservations";

function fakeAccount() {
  return { recordId: "u1", credits: 20, cedula: "123", genero: null, pushToken: null, trackingConsent: true };
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

describe("Límite de 3 reservas — por ciclo de facturación, no por mes calendario", () => {
  beforeEach(() => vi.clearAllMocks());

  it("el período vigente empieza el día que cobra el plan, no el día 1 del mes calendario", async () => {
    (getGymById as ReturnType<typeof vi.fn>).mockResolvedValue(gym);
    (getUserCreditsByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(fakeAccount());
    // Próximo cobro en 29 días -> el período vigente empezó hace 1 día
    // (29 - 30). Las 3 reservas de abajo son de ANTES de ese arranque (del
    // ciclo anterior), así que no deben contar para el límite de hoy.
    (getSubscriptionByEmail as ReturnType<typeof vi.fn>).mockResolvedValue({
      estado: "Activa",
      plan: "plan-starter",
      proximoCobro: daysFromNow(29).slice(0, 10),
    });
    (getAirtableBase as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      fakeBase({
        Reservas: fakeTable([
          reserva(daysFromNow(-25)),
          reserva(daysFromNow(-15)),
          reserva(daysFromNow(-5)),
        ]),
      })
    );

    const result = await createReservation({
      userEmail: "ana@test.com",
      userName: "Ana",
      claseId: "clase1",
      gimnasioId: "gym1",
      claseCredits: 5,
      fechaISO: daysFromNow(2),
    });

    expect(result.ok).toBe(true);
  });

  it("bloquea si ya tiene 3 reservas DENTRO del ciclo vigente", async () => {
    (getGymById as ReturnType<typeof vi.fn>).mockResolvedValue(gym);
    (getUserCreditsByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(fakeAccount());
    (getSubscriptionByEmail as ReturnType<typeof vi.fn>).mockResolvedValue({
      estado: "Activa",
      plan: "plan-starter",
      proximoCobro: daysFromNow(29).slice(0, 10),
    });
    (getAirtableBase as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      fakeBase({
        Reservas: fakeTable([
          reserva(daysFromNow(-0.5)),
          reserva(daysFromNow(1)),
          reserva(daysFromNow(5)),
        ]),
      })
    );

    const result = await createReservation({
      userEmail: "ana@test.com",
      userName: "Ana",
      claseId: "clase1",
      gimnasioId: "gym1",
      claseCredits: 5,
      fechaISO: daysFromNow(10),
    });

    expect(result.ok).toBe(false);
  });

  it("sin Suscripcion Activa (prueba o sueltos), sigue usando el mes calendario", async () => {
    (getGymById as ReturnType<typeof vi.fn>).mockResolvedValue(gym);
    (getUserCreditsByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(fakeAccount());
    (getSubscriptionByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (getAirtableBase as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      fakeBase({
        // 3 reservas en el mismo mes calendario que la clase que se quiere
        // reservar (dentro de los próximos 20 días) -> bloquea.
        Reservas: fakeTable([
          reserva(daysFromNow(12)),
          reserva(daysFromNow(14)),
          reserva(daysFromNow(16)),
        ]),
      })
    );

    const result = await createReservation({
      userEmail: "ana@test.com",
      userName: "Ana",
      claseId: "clase1",
      gimnasioId: "gym1",
      claseCredits: 5,
      fechaISO: daysFromNow(18),
    });

    expect(result.ok).toBe(false);
  });
});
