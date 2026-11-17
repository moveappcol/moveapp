/** Decoración de Navidad (23 nov – 31 dic): cajas de regalo con moño,
 * esferas, estrellas y copos, en SVG para que se vean nítidos a cualquier
 * tamaño. Sin <defs>/ids compartidos: con varios en la página, un id dentro
 * de un elemento oculto en móvil deja a los demás sin relleno. */

type Colores = { caja: string; sombra: string; cinta: string };

export const PALETAS_REGALO: Colores[] = [
  { caja: "#FF4F3F", sombra: "#d63a2c", cinta: "#D4FF3F" },
  { caja: "#D4FF3F", sombra: "#b5dc2a", cinta: "#FF4F3F" },
  { caja: "#ffffff", sombra: "#e6ece6", cinta: "#FF4F3F" },
  { caja: "#c9182b", sombra: "#9e0f1c", cinta: "#f5d36b" },
  { caja: "#f5d36b", sombra: "#d9b44a", cinta: "#c9182b" },
];

/** Caja de regalo con cinta cruzada y un moño grande arriba. */
export function CajaRegalo({ className, colores = PALETAS_REGALO[0] }: { className: string; colores?: Colores }) {
  const { caja, sombra, cinta } = colores;
  return (
    <svg viewBox="0 0 100 110" className={className} aria-hidden="true">
      {/* cuerpo */}
      <rect x="10" y="42" width="80" height="62" rx="4" fill={caja} />
      <rect x="10" y="42" width="80" height="62" rx="4" fill={sombra} opacity="0.35" clipPath="inset(0 0 0 50%)" />
      {/* tapa */}
      <rect x="4" y="30" width="92" height="18" rx="4" fill={caja} />
      <rect x="4" y="44" width="92" height="4" fill={sombra} opacity="0.6" />
      {/* cintas */}
      <rect x="44" y="30" width="12" height="74" fill={cinta} />
      <rect x="10" y="66" width="80" height="10" fill={cinta} opacity="0.9" />
      {/* moño */}
      <path d="M50 31 C 30 6, 8 16, 22 30 C 30 37, 44 34, 50 31 Z" fill={cinta} />
      <path d="M50 31 C 70 6, 92 16, 78 30 C 70 37, 56 34, 50 31 Z" fill={cinta} />
      <path d="M50 31 C 40 22, 30 22, 27 27" stroke={sombra} strokeWidth="2" fill="none" opacity="0.5" />
      <path d="M50 31 C 60 22, 70 22, 73 27" stroke={sombra} strokeWidth="2" fill="none" opacity="0.5" />
      <path d="M47 33 L 38 48 L 46 45 Z" fill={cinta} />
      <path d="M53 33 L 62 48 L 54 45 Z" fill={cinta} />
      <circle cx="50" cy="31" r="6" fill={cinta} />
      <circle cx="48" cy="29" r="2" fill="#fff" opacity="0.5" />
    </svg>
  );
}

/** Moño suelto, grande — para las esquinas de las tarjetas. */
export function Mono({ className, color = "#FF4F3F" }: { className: string; color?: string }) {
  return (
    <svg viewBox="0 0 100 70" className={className} aria-hidden="true">
      <path d="M50 30 C 20 -8, -6 14, 16 32 C 28 42, 44 36, 50 30 Z" fill={color} />
      <path d="M50 30 C 80 -8, 106 14, 84 32 C 72 42, 56 36, 50 30 Z" fill={color} />
      <path d="M50 30 C 36 16, 22 16, 18 24" stroke="#000" strokeOpacity="0.18" strokeWidth="3" fill="none" />
      <path d="M50 30 C 64 16, 78 16, 82 24" stroke="#000" strokeOpacity="0.18" strokeWidth="3" fill="none" />
      <path d="M46 33 L 30 68 L 42 62 Z" fill={color} />
      <path d="M54 33 L 70 68 L 58 62 Z" fill={color} />
      <circle cx="50" cy="31" r="9" fill={color} />
      <circle cx="47" cy="28" r="3" fill="#fff" opacity="0.45" />
    </svg>
  );
}

export function Esfera({ className, color = "#c9182b" }: { className: string; color?: string }) {
  return (
    <svg viewBox="0 0 60 80" className={className} aria-hidden="true">
      <line x1="30" y1="0" x2="30" y2="14" stroke="#f5d36b" strokeWidth="1.5" />
      <rect x="23" y="13" width="14" height="8" rx="2" fill="#f5d36b" />
      <circle cx="30" cy="48" r="27" fill={color} />
      <circle cx="30" cy="48" r="27" fill="#000" opacity="0.15" clipPath="inset(0 0 0 55%)" />
      <ellipse cx="21" cy="38" rx="6" ry="9" fill="#fff" opacity="0.35" />
    </svg>
  );
}

export function Estrella({ className, color = "#f5d36b" }: { className: string; color?: string }) {
  return (
    <svg viewBox="0 0 50 50" className={className} aria-hidden="true">
      <path d="M25 2 L31 18 L48 19 L35 30 L39 47 L25 38 L11 47 L15 30 L2 19 L19 18 Z" fill={color} />
    </svg>
  );
}

export function Copo({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <g stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round">
        <line x1="20" y1="3" x2="20" y2="37" />
        <line x1="5" y1="11.5" x2="35" y2="28.5" />
        <line x1="5" y1="28.5" x2="35" y2="11.5" />
        <path d="M15 6 L20 10 L25 6 M15 34 L20 30 L25 34" fill="none" />
      </g>
    </svg>
  );
}

/** Fondo festivo para una sección verde: copos, estrellas, esferas y una
 * pila de regalos en las esquinas inferiores. Va dentro de un contenedor
 * `relative overflow-hidden`. */
export function FondoNavidad() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      <Copo className="absolute left-[4%] top-8 h-6 w-6 opacity-40" />
      <Copo className="absolute left-[30%] top-4 hidden h-4 w-4 opacity-30 md:block" />
      <Copo className="absolute right-[38%] top-10 hidden h-5 w-5 opacity-30 md:block" />
      <Copo className="absolute right-[6%] top-1/2 h-4 w-4 opacity-30" />
      <Copo className="absolute left-[46%] bottom-10 hidden h-6 w-6 opacity-25 md:block" />
      <Estrella className="absolute left-[12%] top-16 hidden h-6 w-6 lg:block" />
      <Estrella className="absolute right-[20%] top-6 h-5 w-5" />
      <Estrella className="absolute right-[44%] bottom-16 hidden h-4 w-4 opacity-70 md:block" />
      <Esfera className="absolute left-[2%] top-0 hidden h-20 w-14 lg:block" />
      <Esfera className="absolute left-[7%] top-0 hidden h-14 w-10 lg:block" color="#D4FF3F" />
      <Esfera className="absolute right-[3%] top-0 h-16 w-11 sm:h-24 sm:w-16" color="#FF4F3F" />
      <Esfera className="absolute right-[10%] top-0 hidden h-16 w-11 sm:block" color="#f5d36b" />

      <div className="absolute -bottom-2 left-[1%] hidden items-end lg:flex">
        <CajaRegalo className="h-24 w-24" colores={PALETAS_REGALO[3]} />
        <CajaRegalo className="-ml-4 h-16 w-16" colores={PALETAS_REGALO[1]} />
        <CajaRegalo className="-ml-3 h-20 w-20" colores={PALETAS_REGALO[2]} />
      </div>
    </div>
  );
}
