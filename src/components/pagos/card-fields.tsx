"use client";

/** Campos de tarjeta + aceptación de términos, compartidos entre el
 * formulario de suscribirse a un plan y el de comprar créditos
 * adicionales — mismo modelo de cobro en los dos casos. */
export default function CardFields({
  number,
  setNumber,
  cardHolder,
  setCardHolder,
  expMonth,
  setExpMonth,
  expYear,
  setExpYear,
  cvc,
  setCvc,
  accepted,
  setAccepted,
  permalinkAcceptance,
  permalinkPersonalAuth,
}: {
  number: string;
  setNumber: (value: string) => void;
  cardHolder: string;
  setCardHolder: (value: string) => void;
  expMonth: string;
  setExpMonth: (value: string) => void;
  expYear: string;
  setExpYear: (value: string) => void;
  cvc: string;
  setCvc: (value: string) => void;
  accepted: boolean;
  setAccepted: (value: boolean) => void;
  permalinkAcceptance: string;
  permalinkPersonalAuth: string;
}) {
  return (
    <>
      <label className="block">
        <span className="font-heading text-sm font-medium text-move-green">Número de tarjeta</span>
        <input
          type="text"
          inputMode="numeric"
          required
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          placeholder="4242 4242 4242 4242"
          className="mt-2 w-full rounded-xl border border-move-green/20 px-4 py-3 font-body text-move-green outline-none focus:border-move-coral"
        />
      </label>

      <label className="block">
        <span className="font-heading text-sm font-medium text-move-green">Nombre en la tarjeta</span>
        <input
          type="text"
          required
          value={cardHolder}
          onChange={(e) => setCardHolder(e.target.value)}
          className="mt-2 w-full rounded-xl border border-move-green/20 px-4 py-3 font-body text-move-green outline-none focus:border-move-coral"
        />
      </label>

      <div className="grid grid-cols-3 gap-3">
        <label className="block">
          <span className="font-heading text-sm font-medium text-move-green">Mes</span>
          <input
            type="text"
            inputMode="numeric"
            required
            maxLength={2}
            placeholder="MM"
            value={expMonth}
            onChange={(e) => setExpMonth(e.target.value)}
            className="mt-2 w-full rounded-xl border border-move-green/20 px-4 py-3 font-body text-move-green outline-none focus:border-move-coral"
          />
        </label>
        <label className="block">
          <span className="font-heading text-sm font-medium text-move-green">Año</span>
          <input
            type="text"
            inputMode="numeric"
            required
            maxLength={2}
            placeholder="AA"
            value={expYear}
            onChange={(e) => setExpYear(e.target.value)}
            className="mt-2 w-full rounded-xl border border-move-green/20 px-4 py-3 font-body text-move-green outline-none focus:border-move-coral"
          />
        </label>
        <label className="block">
          <span className="font-heading text-sm font-medium text-move-green">CVC</span>
          <input
            type="text"
            inputMode="numeric"
            required
            maxLength={4}
            value={cvc}
            onChange={(e) => setCvc(e.target.value)}
            className="mt-2 w-full rounded-xl border border-move-green/20 px-4 py-3 font-body text-move-green outline-none focus:border-move-coral"
          />
        </label>
      </div>

      <label className="flex items-start gap-2 font-body text-xs text-move-green/70">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          className="mt-0.5"
        />
        <span>
          Acepto los{" "}
          <a href={permalinkAcceptance} target="_blank" rel="noopener noreferrer" className="underline">
            términos y condiciones
          </a>{" "}
          y la{" "}
          <a href={permalinkPersonalAuth} target="_blank" rel="noopener noreferrer" className="underline">
            autorización de tratamiento de datos
          </a>{" "}
          de Wompi.
        </span>
      </label>
    </>
  );
}
