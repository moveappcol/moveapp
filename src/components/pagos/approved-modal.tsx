"use client";

import { createPortal } from "react-dom";

/** Cajita de confirmación tras un cobro aprobado — mismo estilo que la de
 * "Reserva confirmada" en las clases, para que se sienta consistente en
 * toda la app. */
export default function ApprovedModal({
  title,
  message,
  buttonLabel,
  onClose,
}: {
  title: string;
  message: string;
  buttonLabel: string;
  onClose: () => void;
}) {
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-move-green/45 px-6">
      <div className="w-full max-w-sm rounded-2xl bg-white p-7 text-center shadow-xl">
        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-move-green">
          <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-white stroke-[3]">
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <p className="mt-3 font-heading text-lg font-bold text-move-green">{title}</p>
        <p className="mt-1 font-body text-sm text-move-green/70">{message}</p>
        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-full bg-move-coral px-5 py-2.5 font-heading text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          {buttonLabel}
        </button>
      </div>
    </div>,
    document.body
  );
}
