"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/** Grilla de fotos del gimnasio + lightbox al tocar una — antes eran <img>
 * sueltas sin ninguna acción al tocarlas, lo que generaba "dead clicks" en
 * Clarity (confirmado viendo grabaciones reales: la gente las toca
 * esperando verlas más grandes). */
export default function PhotoGallery({ photos, alt }: { photos: string[]; alt: string }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  useEffect(() => {
    if (openIndex === null) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenIndex(null);
      if (e.key === "ArrowRight") setOpenIndex((i) => (i === null ? i : (i + 1) % photos.length));
      if (e.key === "ArrowLeft")
        setOpenIndex((i) => (i === null ? i : (i - 1 + photos.length) % photos.length));
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openIndex, photos.length]);

  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        {photos.map((url, i) => (
          <button
            key={url}
            type="button"
            onClick={() => setOpenIndex(i)}
            className="aspect-square w-full overflow-hidden rounded-2xl"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={alt} className="h-full w-full object-cover" />
          </button>
        ))}
      </div>

      {openIndex !== null &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-move-green/90 px-4"
            onClick={() => setOpenIndex(null)}
          >
            <button
              type="button"
              onClick={() => setOpenIndex(null)}
              aria-label="Cerrar"
              className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-opacity hover:opacity-80"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[2.5]">
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              </svg>
            </button>

            {photos.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenIndex((i) => (i === null ? i : (i - 1 + photos.length) % photos.length));
                  }}
                  aria-label="Anterior"
                  className="absolute left-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-opacity hover:opacity-80 sm:left-6"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[2.5]">
                    <path d="M15 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenIndex((i) => (i === null ? i : (i + 1) % photos.length));
                  }}
                  aria-label="Siguiente"
                  className="absolute right-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-opacity hover:opacity-80 sm:right-6"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[2.5]">
                    <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </>
            )}

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photos[openIndex]}
              alt={alt}
              onClick={(e) => e.stopPropagation()}
              className="max-h-[85vh] max-w-full rounded-xl object-contain"
            />
          </div>,
          document.body
        )}
    </>
  );
}
