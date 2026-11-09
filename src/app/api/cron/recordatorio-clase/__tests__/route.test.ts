import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/classes", () => ({ getAllClasesConFecha: vi.fn() }));
vi.mock("@/lib/reservations", () => ({
  fetchAllReservasDetalle: vi.fn().mockResolvedValue([]),
  filterReservationsDetailForClase: vi.fn(),
  markRecordatorioEnviado: vi.fn(),
  markCorreoDespuesClaseEnviado: vi.fn(),
}));
vi.mock("@/lib/email", () => ({
  sendClassReminderEmail: vi.fn().mockResolvedValue(undefined),
  sendAfterClassEmail: vi.fn().mockResolvedValue(undefined),
  sendOpsAlertEmail: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/users", () => ({ getUserCreditsByEmail: vi.fn().mockResolvedValue(null) }));
vi.mock("@/lib/push", () => ({ sendPushNotification: vi.fn() }));
vi.mock("@/lib/gyms", () => ({ getGymById: vi.fn().mockResolvedValue(null) }));

import { getAllClasesConFecha } from "@/lib/classes";
import { filterReservationsDetailForClase } from "@/lib/reservations";
import { sendClassReminderEmail, sendAfterClassEmail } from "@/lib/email";
import { GET as recordatorio } from "@/app/api/cron/recordatorio-clase/route";
import { GET as despues } from "@/app/api/cron/despues-clase/route";

function fakeRequest() {
  return { headers: { get: () => `Bearer ${process.env.CRON_SECRET}` } } as unknown as Parameters<
    typeof recordatorio
  >[0];
}

function reserva(correo: string, estado: string) {
  return {
    id: correo,
    correo,
    userName: correo,
    estado,
    recordatorioEnviado: false,
    correoDespuesClaseEnviado: false,
  };
}

const RESERVAS = [
  reserva("reservado@test.com", "Reservado"),
  reserva("a-tiempo@test.com", "Cancelado on time"),
  reserva("tarde@test.com", "Cancelado"),
];

function clase(fecha: Date) {
  return { id: "c1", name: "Yoga", fecha: fecha.toISOString(), gimnasioId: "g1", duracionMinutos: 60 };
}

describe("correos de clase — nunca a quien canceló", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "s";
    (filterReservationsDetailForClase as ReturnType<typeof vi.fn>).mockReturnValue(RESERVAS);
  });

  it("recordatorio: solo a quien sigue reservado, no a cancelaciones a tiempo ni tarde", async () => {
    (getAllClasesConFecha as ReturnType<typeof vi.fn>).mockResolvedValue([
      clase(new Date(Date.now() + 180 * 60_000)),
    ]);

    await recordatorio(fakeRequest());

    expect(sendClassReminderEmail).toHaveBeenCalledTimes(1);
    expect(sendClassReminderEmail).toHaveBeenCalledWith(
      expect.objectContaining({ userEmail: "reservado@test.com" })
    );
  });

  it("después de clase: solo a quien sigue reservado, no a cancelaciones a tiempo ni tarde", async () => {
    // Terminó hace 5 minutos (empezó hace 65 y dura 60).
    (getAllClasesConFecha as ReturnType<typeof vi.fn>).mockResolvedValue([
      clase(new Date(Date.now() - 65 * 60_000)),
    ]);

    await despues(fakeRequest());

    expect(sendAfterClassEmail).toHaveBeenCalledTimes(1);
    expect(sendAfterClassEmail).toHaveBeenCalledWith({ userEmail: "reservado@test.com" });
  });
});
