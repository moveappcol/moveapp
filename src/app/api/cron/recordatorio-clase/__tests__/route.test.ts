import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/classes", () => ({ getAllClasesConFecha: vi.fn() }));
vi.mock("@/lib/reservations", () => ({
  fetchAllReservasDetalle: vi.fn().mockResolvedValue([]),
  filterReservationsDetailForClase: vi.fn(),
  markRecordatorioEnviado: vi.fn(),
  markRecordatorioCancelacionEnviado: vi.fn(),
  CANCELLATION_WINDOW_HOURS: 24,
  markCorreoDespuesClaseEnviado: vi.fn(),
}));
vi.mock("@/lib/email", () => ({
  sendClassReminderEmail: vi.fn().mockResolvedValue(undefined),
  sendCancellationWindowReminderEmail: vi.fn().mockResolvedValue(undefined),
  sendAfterClassEmail: vi.fn().mockResolvedValue(undefined),
  sendOpsAlertEmail: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/users", () => ({ getUserCreditsByEmail: vi.fn().mockResolvedValue(null) }));
vi.mock("@/lib/push", () => ({ sendPushNotification: vi.fn() }));
vi.mock("@/lib/gyms", () => ({ getGymById: vi.fn().mockResolvedValue(null) }));

import { getAllClasesConFecha } from "@/lib/classes";
import { getUserCreditsByEmail } from "@/lib/users";
import { sendPushNotification } from "@/lib/push";
import { filterReservationsDetailForClase, markRecordatorioCancelacionEnviado } from "@/lib/reservations";
import {
  sendClassReminderEmail,
  sendAfterClassEmail,
  sendCancellationWindowReminderEmail,
  sendOpsAlertEmail,
} from "@/lib/email";
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
    recordatorioCancelacionEnviado: false,
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

  it("27h antes: recordatorio de 'aún puedes cancelar sin costo' solo a quien sigue reservado", async () => {
    (getUserCreditsByEmail as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ pushToken: "token-reservado" });
    // Clase el 11 nov a las 7:00 a. m. Bogotá (12:00 UTC), 27h desde ahora.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-10T09:00:00.000Z"));
    (getAllClasesConFecha as ReturnType<typeof vi.fn>).mockResolvedValue([
      clase(new Date("2026-11-11T12:00:00.000Z")),
    ]);

    await recordatorio(fakeRequest());
    vi.useRealTimers();

    expect(sendCancellationWindowReminderEmail).toHaveBeenCalledTimes(1);
    const params = (sendCancellationWindowReminderEmail as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(params.userEmail).toBe("reservado@test.com");
    expect(params.limiteCancelacion).toMatch(/10 de noviembre a las 7:00/);
    expect(markRecordatorioCancelacionEnviado).toHaveBeenCalledWith("reservado@test.com");
    expect(sendPushNotification).toHaveBeenCalledTimes(1);
    expect(sendPushNotification).toHaveBeenCalledWith(
      expect.objectContaining({ to: "token-reservado", title: "¡Mañana nos vemos! 💚" })
    );
    // Ese mismo run no manda el recordatorio de 3h.
    expect(sendClassReminderEmail).not.toHaveBeenCalled();
  });

  it("27h antes: si no se puede marcar la reserva, no manda el correo (evita duplicados) y avisa", async () => {
    (markRecordatorioCancelacionEnviado as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('Unknown field name: "Recordatorio cancelacion enviado"')
    );
    (getAllClasesConFecha as ReturnType<typeof vi.fn>).mockResolvedValue([
      clase(new Date(Date.now() + 27 * 60 * 60_000)),
    ]);

    await recordatorio(fakeRequest());

    expect(sendCancellationWindowReminderEmail).not.toHaveBeenCalled();
    expect(sendOpsAlertEmail).toHaveBeenCalledTimes(1);
  });

  it("27h antes: no lo reenvía a quien ya lo recibió", async () => {
    (filterReservationsDetailForClase as ReturnType<typeof vi.fn>).mockReturnValue([
      { ...reserva("reservado@test.com", "Reservado"), recordatorioCancelacionEnviado: true },
    ]);
    (getAllClasesConFecha as ReturnType<typeof vi.fn>).mockResolvedValue([
      clase(new Date(Date.now() + 27 * 60 * 60_000)),
    ]);

    await recordatorio(fakeRequest());

    expect(sendCancellationWindowReminderEmail).not.toHaveBeenCalled();
  });
});
