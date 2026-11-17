import Image from "next/image";

// Los tonos del papel impreso (un poco más suaves que el verde/coral de
// pantalla), para que se vea igual a la tarjeta real.
const VERDE_PAPEL = "#33502f";
const CORAL_PAPEL = "#ec7363";

/** Frente de la tarjeta física: verde con UNIQUE en blanco. */
export function TarjetaFrente({ className = "" }: { className?: string }) {
  return (
    <div
      className={`relative aspect-[10/7] overflow-hidden rounded-[6px] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.45)] ${className}`}
      style={{ background: VERDE_PAPEL }}
    >
      {/* borde coral asomando, como la tarjeta doblada */}
      <div className="absolute inset-x-0 bottom-0 h-[5%]" style={{ background: CORAL_PAPEL }} />
      <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_30%_20%,rgba(255,255,255,0.10),transparent_60%)]" />
      <Image
        src="/brand/unique-wordmark-white.png"
        alt="UNIQUE"
        width={854}
        height={277}
        sizes="(min-width: 768px) 260px, 50vw"
        className="absolute left-1/2 top-[46%] w-[52%] -translate-x-1/2 -translate-y-1/2"
        priority
      />
    </div>
  );
}
