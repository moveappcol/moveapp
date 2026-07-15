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

/** Llena la plantilla de reservas (pre-reservas 24h antes / reservas
 * finales) con los datos reales de una clase — mismo estilo y colores de
 * las plantillas .rtf originales, solo cambia el contenido. */
export function buildReservationRtf(params: {
  title: string;
  fecha: string;
  gimnasio: string;
  claseName: string;
  horario: string;
  names: string[];
}): string {
  const namesBlock = params.names.length
    ? params.names.map((n) => escapeRtf(n)).join("\\par\n")
    : escapeRtf("Sin reservas.");

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
\\pard\\qc\\f1\\fs22\\cf3 ${namesBlock}\\cf0\\par
\\pard\\par\\par\\par\\par\\par
\\pard\\qc\\f1\\fs22\\cf3 Gracias por ser parte de Unique.\\cf0\\par
}`;
}
