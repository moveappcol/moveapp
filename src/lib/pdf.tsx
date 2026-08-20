import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { formatCOP } from "./credits-pricing";

const GREEN = "#063009";
const BLACK = "#111111";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 11, fontFamily: "Helvetica" },
  logo: { fontSize: 32, fontWeight: 700, textAlign: "center", color: GREEN, marginBottom: 24 },
  label: { fontSize: 11, fontWeight: 700, marginBottom: 6 },
  title: { fontSize: 16, fontWeight: 700, textAlign: "center", marginTop: 16, marginBottom: 16 },
  table: { display: "flex", flexDirection: "column", borderWidth: 1, borderColor: GREEN },
  headerRow: { flexDirection: "row", backgroundColor: GREEN },
  row: { flexDirection: "row", borderTopWidth: 1, borderColor: GREEN },
  headerCell: {
    flex: 1,
    padding: 8,
    color: "#ffffff",
    fontWeight: 700,
    fontSize: 10,
    textAlign: "center",
  },
  cell: { flex: 1, padding: 8, fontSize: 10, textAlign: "center" },
  footer: { fontSize: 11, fontWeight: 700, textAlign: "center", marginTop: 32 },
  gymHeading: { fontSize: 13, fontWeight: 700, color: GREEN, marginTop: 24, marginBottom: 8 },
  totalLine: { fontSize: 11, fontWeight: 700, marginTop: 8 },
});

function Logo() {
  return <Text style={styles.logo}>UNIQUE</Text>;
}

function Table({ headers, rows, widths }: { headers: string[]; rows: string[][]; widths?: number[] }) {
  const flexFor = (i: number) => widths?.[i] ?? 1;
  return (
    <View style={styles.table}>
      <View style={styles.headerRow}>
        {headers.map((h, i) => (
          <Text key={h} style={{ ...styles.headerCell, flex: flexFor(i) }}>
            {h}
          </Text>
        ))}
      </View>
      {rows.map((row, i) => (
        <View key={i} style={styles.row}>
          {row.map((cell, j) => (
            <Text key={j} style={{ ...styles.cell, flex: flexFor(j) }}>
              {cell || "—"}
            </Text>
          ))}
        </View>
      ))}
      {rows.length === 0 && (
        <View style={styles.row}>
          <Text style={{ ...styles.cell, flex: headers.length }}>Sin reservas.</Text>
        </View>
      )}
    </View>
  );
}

export type ReservaFinalRow = { tipo: "A" | "B" | null; nombre: string; cedula: string; correo: string };

/** PDF de "reservas finales" — mismo documento para 24h antes y 20 min
 * antes, solo cambia el título y el color del texto (negro para 20 min,
 * verde para 24h), igual a las plantillas de referencia. */
export async function buildReservasFinalesPdf(params: {
  variant: "20min" | "24h";
  fecha: string;
  gimnasio: string;
  clase: string;
  hora: string;
  reservas: ReservaFinalRow[];
}): Promise<Buffer> {
  const color = params.variant === "20min" ? BLACK : GREEN;
  const titulo =
    params.variant === "20min" ? "RESERVAS FINALES (20 min antes )" : "RESERVAS FINALES (24 h antes )";

  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        <Logo />
        <Text style={{ ...styles.label, color }}>Fecha : {params.fecha}</Text>
        <Text style={{ ...styles.label, color }}>Gimnasio: {params.gimnasio}</Text>
        <Text style={{ ...styles.label, color }}>Clase : {params.clase}</Text>
        <Text style={{ ...styles.label, color }}>Hora : {params.hora}</Text>

        <Text style={{ ...styles.title, color }}>{titulo}</Text>

        <Table
          headers={["TIPO", "NOMBRE", "CÉDULA", "CORREO"]}
          rows={params.reservas.map((r) => [r.tipo ?? "—", r.nombre, r.cedula, r.correo])}
        />

        <Text style={{ ...styles.footer, color }}>¡ Gracias por ser parte de UNIQUE !</Text>
      </Page>
    </Document>
  );

  return renderToBuffer(doc);
}

export type ReservaPeriodoRow = { tipo: "A" | "B" | null; nombre: string; cedula: string; clase: string; fecha: string };

/** PDF de "reservas totales del periodo" — uno por gimnasio, sin plata.
 * Se manda al gimnasio cada 15 días. */
export async function buildReservasTotalesPeriodoPdf(params: {
  periodo: string;
  gimnasio: string;
  reservas: ReservaPeriodoRow[];
  totalTipoA: number;
  totalTipoB: number;
}): Promise<Buffer> {
  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        <Logo />
        <Text style={{ ...styles.label, color: GREEN }}>Periodo : {params.periodo}</Text>
        <Text style={{ ...styles.label, color: GREEN }}>Gimnasio: {params.gimnasio}</Text>

        <Text style={{ ...styles.title, color: GREEN }}>RESERVAS TOTALES DEL PERIODO</Text>

        <Table
          headers={["TIPO", "NOMBRE", "CÉDULA", "CLASE", "FECHA"]}
          rows={params.reservas.map((r) => [r.tipo ?? "—", r.nombre, r.cedula, r.clase, r.fecha])}
        />

        <Text style={{ ...styles.totalLine, color: BLACK }}>
          TOTAL RESERVAS TIPO A : {params.totalTipoA}
        </Text>
        <Text style={{ ...styles.totalLine, color: BLACK }}>
          TOTAL RESERVAS TIPO B : {params.totalTipoB}
        </Text>

        <Text style={{ ...styles.footer, color: GREEN }}>¡ Gracias por ser parte de UNIQUE !</Text>
      </Page>
    </Document>
  );

  return renderToBuffer(doc);
}

export type ReservaPagoRow = {
  tipo: "A" | "B" | null;
  nombre: string;
  cedula: string;
  fecha: string;
  clase: string;
  porcentaje: number | null;
  valorClase: number | null;
  totalPorReserva: number | null;
};

export type GymFormPagos = { gimnasio: string; reservas: ReservaPagoRow[]; totalAPagar: number };

/** PDF de "form pagos" — un solo documento con todos los gimnasios, con
 * porcentaje/valor/total por reserva. Solo para Unique, nunca a los
 * gimnasios. */
const FORM_PAGOS_WIDTHS = [0.6, 1.6, 1.1, 0.9, 1.4, 1, 1.1, 1.1];

export async function buildFormPagosPdf(params: { periodo: string; gyms: GymFormPagos[] }): Promise<Buffer> {
  const doc = (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <Logo />
        <Text style={{ ...styles.label, color: GREEN }}>Fecha : {params.periodo}</Text>

        {params.gyms.map((gym) => (
          <View key={gym.gimnasio} wrap={false}>
            <Text style={styles.gymHeading}>Gimnasio : {gym.gimnasio}</Text>
            <Table
              headers={["TIPO", "NOMBRE", "CEDULA", "FECHA", "CLASE", "PORCENTAJE", "VALOR DE CLASE", "TOTAL"]}
              widths={FORM_PAGOS_WIDTHS}
              rows={gym.reservas.map((r) => [
                r.tipo ?? "—",
                r.nombre,
                r.cedula,
                r.fecha,
                r.clase,
                r.porcentaje !== null ? `${Math.round(r.porcentaje * 100)}%` : "—",
                r.valorClase !== null ? formatCOP(r.valorClase) : "—",
                r.totalPorReserva !== null ? formatCOP(r.totalPorReserva) : "—",
              ])}
            />
            <Text style={styles.totalLine}>TOTAL A PAGAR : {formatCOP(gym.totalAPagar)}</Text>
          </View>
        ))}

        <Text style={{ ...styles.footer, color: GREEN }}>¡ Gracias por ser parte de UNIQUE !</Text>
      </Page>
    </Document>
  );

  return renderToBuffer(doc);
}
