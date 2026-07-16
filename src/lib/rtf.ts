/** Convierte texto UTF-8 a texto seguro para RTF \ansi (escapa \, {, } y
 * codifica todo lo no-ASCII como \uNNNN?, como exige el formato RTF). */
function escapeRtf(text: string): string {
  let out = "";
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    if (ch === "\\" || ch === "{" || ch === "}") {
      out += `\\${ch}`;
    } else if (code < 128) {
      out += ch;
    } else if (code <= 0xffff) {
      out += `\\u${code}?`;
    } else {
      const high = Math.floor((code - 0x10000) / 0x400) + 0xd800;
      const low = ((code - 0x10000) % 0x400) + 0xdc00;
      out += `\\u${high}?\\u${low}?`;
    }
  }
  return out;
}

const COL_WIDTHS = [1600, 6100, 9200]; // twips acumulados: Tipo | Nombre | Cédula
// Ya viene en formato de escape RTF (\uNNNN?) — nunca pasar por escapeRtf().
const EMDASH_RTF = "\\u8212?";

function tableRow(cells: string[], bold: boolean): string {
  const cellx = COL_WIDTHS.map((w) => `\\cellx${w}`).join("");
  const weight = bold ? "\\b" : "";
  const content = cells
    .map((c) => `\\intbl\\ql\\f1${weight}\\fs20\\cf2 ${c}\\cf0${bold ? "\\b0" : ""}\\cell`)
    .join("");
  return `\\trowd\\trgaph80\\trleft0${cellx}\n${content}\\row\n`;
}

export type ReservaRtfRow = { tipo: "A" | "B" | null; nombre: string; cedula: string };

/** Llena la plantilla de reservas (pre-reservas 24h antes / reservas
 * finales) con una tabla Tipo | Nombre | Cédula y los totales por tipo al
 * final — mismo estilo y colores de las plantillas .rtf originales. */
export function buildReservationRtf(params: {
  title: string;
  fecha: string;
  gimnasio: string;
  claseName: string;
  horario: string;
  reservas: ReservaRtfRow[];
}): string {
  const totalA = params.reservas.filter((r) => r.tipo === "A").length;
  const totalB = params.reservas.filter((r) => r.tipo === "B").length;

  const header = tableRow([escapeRtf("Tipo"), escapeRtf("Nombre"), escapeRtf("Cédula")], true);
  const rows = params.reservas.length
    ? params.reservas
        .map((r) =>
          tableRow(
            [r.tipo ?? EMDASH_RTF, escapeRtf(r.nombre), r.cedula ? escapeRtf(r.cedula) : EMDASH_RTF],
            false
          )
        )
        .join("")
    : tableRow([EMDASH_RTF, escapeRtf("Sin reservas."), EMDASH_RTF], false);

  return `{\\rtf1\\ansi\\deff0
{\\fonttbl{\\f0 Poppins;}{\\f1 Inter;}}
{\\colortbl;\\red255\\green79\\blue63;\\red6\\green48\\blue9;\\red120\\green120\\blue120;}
\\pard\\qr\\f0\\b\\fs40\\cf1 UNIQUE\\b0\\cf0\\par
\\pard\\par
\\pard\\ql\\f1\\fs26\\cf2 Fecha: ${escapeRtf(params.fecha)}\\par
Gimnasio: ${escapeRtf(params.gimnasio)}\\cf0\\par
\\pard\\par\\par
\\pard\\qc\\f0\\b\\fs64\\cf2 ${escapeRtf(params.title)}\\b0\\cf0\\par
\\pard\\par\\par
\\pard\\qc\\f1\\b\\fs28\\cf2 ${escapeRtf(params.claseName)} \\u8212? ${escapeRtf(params.horario)}\\b0\\cf0\\par
\\pard\\par
${header}${rows}
\\pard\\par\\par
\\pard\\ql\\f1\\b\\fs22\\cf2 Total reservas tipo A: ${totalA}\\par
Total reservas tipo B: ${totalB}\\b0\\cf0\\par
\\pard\\par\\par\\par
\\pard\\qc\\f1\\fs22\\cf3 Gracias por ser parte de Unique.\\cf0\\par
}`;
}
