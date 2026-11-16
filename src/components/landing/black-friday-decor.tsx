/** Globo rojo con brillo — decoración del hero en Black Friday (mismo look del arte de
 * Black Friday: globos rojos sobre verde UNIQUE). */
export function Globo({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 60 80" className={className} aria-hidden="true">
      {/* Sin <radialGradient>: con varios globos en la página, un id
          compartido que cae dentro de uno oculto (display:none en móvil)
          deja a los demás sin relleno. Sombra + brillo con elipses. */}
      <ellipse cx="30" cy="32" rx="26" ry="31" fill="#d81f2c" />
      <ellipse cx="34" cy="37" rx="21" ry="25" fill="#a8121e" opacity="0.35" />
      <ellipse cx="27" cy="27" rx="18" ry="22" fill="#ef3340" opacity="0.6" />
      <ellipse cx="21" cy="20" rx="6" ry="9" fill="#fff" opacity="0.18" />
      <path d="M26 62 L34 62 L30 67 Z" fill="#b5141f" />
    </svg>
  );
}

export function Bolsa({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 50 60" className={className} aria-hidden="true">
      <path d="M4 14 L46 14 L46 58 L4 58 Z" fill="#3d3d3d" />
      <path d="M4 14 L46 14 L42 8 L8 8 Z" fill="#e3342f" />
      <path d="M17 20 C17 34 33 34 33 20" stroke="#e3342f" strokeWidth="2.5" fill="none" />
    </svg>
  );
}
