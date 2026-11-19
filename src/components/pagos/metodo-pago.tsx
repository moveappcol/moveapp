"use client";

/** Selector Tarjeta / Nequi y campos de Nequi, compartidos por los
 * checkouts que guardan un medio de pago (plan, Prueba UNIQUE, créditos
 * sueltos). Tarjeta y Nequi son los únicos medios que Wompi deja guardar
 * como fuente de pago para cobrar después sin que la persona esté. */

export type MetodoPago = "tarjeta" | "nequi";

function wompiApiBase(publicKey: string): string {
  return publicKey.startsWith("pub_prod_") ? "https://production.wompi.co/v1" : "https://sandbox.wompi.co/v1";
}

/** Le manda a la persona una solicitud de suscripción a su app de Nequi y
 * espera (hasta ~3 minutos) a que la acepte. El token aprobado ("nequi_…")
 * se le pasa al servidor igual que un token de tarjeta. */
export async function tokenizarNequi(
  publicKey: string,
  telefonoEscrito: string,
  onEsperando: (esperando: boolean) => void
): Promise<{ ok: true; token: string; telefono: string } | { ok: false; error: string }> {
  const telefono = telefonoEscrito.replace(/\D/g, "");
  if (telefono.length !== 10) return { ok: false, error: "Escribe el número de celular de tu cuenta Nequi (10 dígitos)." };
  const base = wompiApiBase(publicKey);
  const res = await fetch(`${base}/tokens/nequi`, {
    method: "POST",
    headers: { Authorization: `Bearer ${publicKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ phone_number: telefono }),
  });
  const json = await res.json();
  const token = json?.data?.id as string | undefined;
  if (!res.ok || !token) {
    return {
      ok: false,
      error: json?.error?.messages ? JSON.stringify(json.error.messages) : "No pudimos conectar con Nequi. Revisa el número.",
    };
  }
  onEsperando(true);
  try {
    for (let intento = 0; intento < 60; intento++) {
      await new Promise((r) => setTimeout(r, 3000));
      const estadoRes = await fetch(`${base}/tokens/nequi/${token}`, { headers: { Authorization: `Bearer ${publicKey}` } });
      const estado = (await estadoRes.json().catch(() => null))?.data?.status as string | undefined;
      if (estado === "APPROVED") return { ok: true, token, telefono };
      if (estado && estado !== "PENDING") return { ok: false, error: "La solicitud en Nequi fue rechazada o expiró. Inténtalo de nuevo." };
    }
    return { ok: false, error: "No vimos la aprobación en Nequi a tiempo. Vuelve a intentarlo y acepta la solicitud en tu app." };
  } finally {
    onEsperando(false);
  }
}

export function MetodoPagoToggle({ metodo, setMetodo }: { metodo: MetodoPago; setMetodo: (m: MetodoPago) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2 rounded-full bg-move-green/5 p-1">
      {(["tarjeta", "nequi"] as const).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => setMetodo(m)}
          className={`rounded-full px-4 py-2 font-heading text-sm font-semibold transition-colors ${
            metodo === m ? "bg-move-green text-white" : "text-move-green/70"
          }`}
        >
          {m === "tarjeta" ? "Tarjeta" : "Nequi"}
        </button>
      ))}
    </div>
  );
}

type TextosAceptacion = {
  aceptoBefore: string;
  terminos: string;
  aceptoMiddle: string;
  autorizacion: string;
  aceptoAfter: string;
};

export function NequiFields({
  telefono,
  setTelefono,
  esperando,
  ayuda,
  accepted,
  setAccepted,
  permalinkAcceptance,
  permalinkPersonalAuth,
  t,
}: {
  telefono: string;
  setTelefono: (v: string) => void;
  esperando: boolean;
  /** Qué va a autorizar en Nequi (ej. "el pago mensual de tu plan"). */
  ayuda: string;
  accepted: boolean;
  setAccepted: (v: boolean) => void;
  permalinkAcceptance: string;
  permalinkPersonalAuth: string;
  t: TextosAceptacion;
}) {
  return (
    <div className="space-y-4">
      <label className="block">
        <span className="font-heading text-sm font-medium text-move-green">Celular de tu cuenta Nequi</span>
        <input
          type="tel"
          inputMode="numeric"
          required
          maxLength={13}
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          placeholder="300 123 4567"
          className="mt-2 w-full rounded-xl border border-move-green/20 px-4 py-3 font-body text-move-green outline-none focus:border-move-coral"
        />
        <span className="mt-1 block font-body text-xs text-move-green/60">{ayuda}</span>
      </label>
      {esperando && (
        <p className="rounded-xl bg-move-lime/40 px-4 py-3 font-heading text-sm font-semibold text-move-green">
          📲 Abre tu app de Nequi y acepta la solicitud de UNIQUE. Te esperamos aquí…
        </p>
      )}
      <label className="flex items-start gap-2 font-body text-xs text-move-green/70">
        <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-0.5" />
        <span>
          {t.aceptoBefore}{" "}
          <a href={permalinkAcceptance} target="_blank" rel="noopener noreferrer" className="underline">
            {t.terminos}
          </a>{" "}
          {t.aceptoMiddle}{" "}
          <a href={permalinkPersonalAuth} target="_blank" rel="noopener noreferrer" className="underline">
            {t.autorizacion}
          </a>{" "}
          {t.aceptoAfter}
        </span>
      </label>
    </div>
  );
}
