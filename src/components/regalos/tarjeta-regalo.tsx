import Image from "next/image";
import { Oswald, Lora } from "next/font/google";

const oswald = Oswald({ subsets: ["latin"], weight: ["600"], display: "swap" });
const lora = Lora({ subsets: ["latin"], weight: ["400"], display: "swap" });

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

/** Interior de la tarjeta abierta: la mitad coral con el mensaje y el
 * recuadro del código, y la mitad verde con la mano y UNIQUE. */
export function TarjetaInterior({
  codigo,
  para,
  deParte,
  className = "",
}: {
  codigo?: string | null;
  para?: string | null;
  deParte?: string | null;
  className?: string;
}) {
  return (
    <div className={`grid grid-cols-2 gap-[3%] ${className}`}>
      <div
        className="relative flex aspect-[7/10] flex-col overflow-hidden rounded-[6px] shadow-[0_24px_50px_-20px_rgba(0,0,0,0.4)] [container-type:inline-size]"
        style={{ background: CORAL_PAPEL }}
      >
        <div className="flex flex-1 flex-col items-center justify-center gap-[6%] px-[8%] text-center">
          <p className={`${lora.className} text-[6.6cqw] leading-snug text-[#2b1a17]`}>
            Clases en los mejores gimnasios
            <br />
            Experiencias wellness
            <br />
            Una comunidad para vivirlo
          </p>
          <p className={`${oswald.className} text-[6cqw] leading-tight text-white`}>
            Porque no hay mejor regalo que algo que te dé salud y te permita vivir experiencias increíbles.
          </p>
        </div>
        <div className="h-px bg-black/10" />
        <div className="flex flex-1 flex-col items-center justify-center gap-[5%] px-[10%]">
          {(para || deParte) && (
            <p className={`${lora.className} text-center text-[6cqw] italic text-[#2b1a17]`}>
              {para && <>Para {para}</>}
              {para && deParte && <br />}
              {deParte && <>De parte de {deParte}</>}
            </p>
          )}
          <div className="flex aspect-[2/1] w-full flex-col items-center justify-center bg-white px-2 shadow-sm">
            <p className={`${lora.className} text-[6.6cqw] tracking-wide text-[#2b1a17]`}>CÓDIGO</p>
            {codigo && (
              <p className="mt-1 font-heading text-[8cqw] font-bold tracking-[0.15em] text-[#063009]">
                {codigo}
              </p>
            )}
          </div>
        </div>
      </div>

      <div
        className="relative flex aspect-[7/10] flex-col overflow-hidden rounded-[6px] shadow-[0_24px_50px_-20px_rgba(0,0,0,0.4)]"
        style={{ background: VERDE_PAPEL }}
      >
        <div className="flex flex-1 items-center justify-center">
          <Image
            src="/brand/unique-handshake-white.png"
            alt=""
            width={928}
            height={454}
            sizes="(min-width: 768px) 160px, 30vw"
            className="w-[52%]"
          />
        </div>
        <div className="h-px bg-black/15" />
        <div className="flex flex-1 items-center justify-center">
          <Image
            src="/brand/unique-wordmark-white.png"
            alt="UNIQUE"
            width={854}
            height={277}
            sizes="(min-width: 768px) 180px, 35vw"
            className="w-[62%]"
          />
        </div>
      </div>
    </div>
  );
}
