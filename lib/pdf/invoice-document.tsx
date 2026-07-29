import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ESTABLISHMENT } from "@/lib/establishment";
import { formatDate, formatCurrency, getNights } from "@/lib/utils";

const INK = "#1c1917"; // stone-900
const MUTED = "#78716c"; // stone-500
const FAINT = "#a8a29e"; // stone-400
const ACCENT = "#b45309"; // amber-700
const LINE = "#e7e5e4"; // stone-200
const PANEL = "#f5f5f4"; // stone-100

const styles = StyleSheet.create({
  page: { padding: 40, paddingBottom: 56, fontSize: 9, fontFamily: "Helvetica", color: "#292524" },

  // ── Cabecera ──────────────────────────────────────────────────────────
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 14 },
  hotelName: { fontFamily: "Times-Bold", fontSize: 23, color: INK },
  hotelSubtitle: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 1.4,
    color: ACCENT,
    marginTop: 3,
    marginBottom: 8,
  },
  contactLine: { fontSize: 8, color: MUTED, lineHeight: 1.5 },

  headerRight: { alignItems: "flex-end" },
  badge: {
    backgroundColor: INK,
    color: "#ffffff",
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  docNumber: { fontFamily: "Times-Bold", fontSize: 15, color: INK, marginTop: 8, marginBottom: 6 },
  metaRow: { flexDirection: "row", marginBottom: 2 },
  metaLabel: { fontSize: 7.5, color: FAINT, textTransform: "uppercase", letterSpacing: 0.5, marginRight: 8 },
  metaValue: { fontSize: 8.5, color: "#44403c" },

  headerDivider: { borderBottom: `1.5 solid ${INK}`, marginBottom: 18 },

  // ── Bloques huésped / estancia ───────────────────────────────────────
  twoCol: { flexDirection: "row", marginBottom: 20 },
  col: { flex: 1 },
  sectionLabel: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: ACCENT,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 7,
  },
  guestName: { fontFamily: "Times-Bold", fontSize: 12.5, color: INK, marginBottom: 4 },
  guestLine: { fontSize: 8.5, color: MUTED, marginBottom: 2 },
  detailRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4, paddingRight: 4 },
  detailLabel: { fontSize: 8, color: FAINT },
  detailValue: { fontSize: 8.5, color: "#44403c", textAlign: "right" },

  // ── Tablas ────────────────────────────────────────────────────────────
  section: { marginBottom: 16 },
  tableHeader: {
    flexDirection: "row",
    borderBottom: `1 solid ${INK}`,
    paddingBottom: 4,
    marginBottom: 4,
  },
  th: { fontSize: 7, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.6, color: FAINT },
  row: { flexDirection: "row", paddingVertical: 5, borderBottom: `1 solid ${LINE}` },
  colDesc: { flex: 2.6 },
  colDate: { flex: 1.3, textAlign: "center" },
  colNights: { flex: 0.7, textAlign: "center" },
  colRate: { flex: 1, textAlign: "right" },
  colAmount: { flex: 1, textAlign: "right" },
  subtotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: PANEL,
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginTop: 2,
  },
  subtotalLabel: { fontSize: 8.5, color: MUTED },
  subtotalValue: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: INK },

  // ── Totales ───────────────────────────────────────────────────────────
  totals: { marginTop: 10, alignSelf: "flex-end", width: 230 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3, fontSize: 9 },
  totalFinal: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: INK,
    color: "#ffffff",
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginTop: 6,
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
  },
  statusLine: { fontSize: 8, textAlign: "right", marginTop: 6 },
});

function capitalize(s: string): string {
  return s.length ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function formatDayLine(date: Date | string, time?: string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const dayDate = capitalize(format(d, "EEEE d 'de' MMMM 'de' yyyy", { locale: es }));
  return time ? `${dayDate} · ${time} h` : dayDate;
}

export interface InvoicePdfProps {
  documentTitle: string; // "FACTURA" o "PRESUPUESTO"
  documentNumber: string;
  bookingRef?: string; // referencia corta de la reserva (facturas)
  issueDate: Date | string;
  validUntil?: Date | string;
  subtotal: number | string;
  tax: number | string;
  total: number | string;
  client: { name: string; documentId?: string; email: string; phone?: string | null };
  roomName: string;
  adults?: number;
  children?: number;
  pricePerNight: number | string;
  accommodationTotal?: number | string; // si falta, se asume que el total es solo alojamiento
  checkInDate: Date | string;
  checkOutDate: Date | string;
  extras?: { description: string; amount: number | string; date: Date | string }[];
  isPaid?: boolean;
}

export function InvoiceDocument(props: InvoicePdfProps) {
  const nights = getNights(props.checkInDate, props.checkOutDate);
  const accommodationTotal = props.accommodationTotal ?? props.total;
  const extras = props.extras ?? [];
  const extrasTotal = extras.reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* ── Cabecera ── */}
        <View style={styles.header}>
          <View style={{ maxWidth: 300 }}>
            <Text style={styles.hotelName}>{ESTABLISHMENT.name}</Text>
            <Text style={styles.hotelSubtitle}>
              Casa de aldea · {ESTABLISHMENT.municipality}, {ESTABLISHMENT.province}
            </Text>
            <Text style={styles.contactLine}>{ESTABLISHMENT.address}</Text>
            <Text style={styles.contactLine}>
              {[ESTABLISHMENT.phone, ESTABLISHMENT.email].filter(Boolean).join(" · ")}
            </Text>
            <Text style={styles.contactLine}>NIF: {ESTABLISHMENT.cif}</Text>
          </View>

          <View style={styles.headerRight}>
            <Text style={styles.badge}>{props.documentTitle}</Text>
            <Text style={styles.docNumber}>{props.documentNumber}</Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Fecha emisión</Text>
              <Text style={styles.metaValue}>{formatDate(props.issueDate, "d 'de' MMMM 'de' yyyy")}</Text>
            </View>
            {props.validUntil && (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Válido hasta</Text>
                <Text style={styles.metaValue}>{formatDate(props.validUntil, "d 'de' MMMM 'de' yyyy")}</Text>
              </View>
            )}
            {props.bookingRef && (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Referencia</Text>
                <Text style={styles.metaValue}>{props.bookingRef.slice(-6).toUpperCase()}</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.headerDivider} />

        {/* ── Huésped / Estancia ── */}
        <View style={styles.twoCol}>
          <View style={styles.col}>
            <Text style={styles.sectionLabel}>Huésped</Text>
            <Text style={styles.guestName}>{props.client.name}</Text>
            {props.client.documentId && <Text style={styles.guestLine}>{props.client.documentId}</Text>}
            <Text style={styles.guestLine}>{props.client.email}</Text>
            {props.client.phone && <Text style={styles.guestLine}>{props.client.phone}</Text>}
          </View>

          <View style={styles.col}>
            <Text style={styles.sectionLabel}>Detalles de la estancia</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Habitación</Text>
              <Text style={styles.detailValue}>{props.roomName}</Text>
            </View>
            {props.adults !== undefined && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Ocupación</Text>
                <Text style={styles.detailValue}>
                  {props.adults} adulto{props.adults !== 1 ? "s" : ""}
                  {props.children ? `, ${props.children} niño${props.children !== 1 ? "s" : ""}` : ""}
                </Text>
              </View>
            )}
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Check-in</Text>
              <Text style={styles.detailValue}>{formatDayLine(props.checkInDate, ESTABLISHMENT.checkInTime)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Check-out</Text>
              <Text style={styles.detailValue}>{formatDayLine(props.checkOutDate, ESTABLISHMENT.checkOutTime)}</Text>
            </View>
          </View>
        </View>

        {/* ── Alojamiento ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Alojamiento</Text>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, styles.colDesc]}>Concepto</Text>
            <Text style={[styles.th, styles.colDate]}>Fechas</Text>
            <Text style={[styles.th, styles.colNights]}>Noches</Text>
            <Text style={[styles.th, styles.colRate]}>Tarifa/noche</Text>
            <Text style={[styles.th, styles.colAmount]}>Importe</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.colDesc}>{props.roomName}</Text>
            <Text style={styles.colDate}>
              {formatDate(props.checkInDate, "dd/MM")} - {formatDate(props.checkOutDate, "dd/MM/yyyy")}
            </Text>
            <Text style={styles.colNights}>{nights}</Text>
            <Text style={styles.colRate}>{formatCurrency(props.pricePerNight)}</Text>
            <Text style={styles.colAmount}>{formatCurrency(accommodationTotal)}</Text>
          </View>
          <View style={styles.subtotalRow}>
            <Text style={styles.subtotalLabel}>Subtotal alojamiento</Text>
            <Text style={styles.subtotalValue}>{formatCurrency(accommodationTotal)}</Text>
          </View>
        </View>

        {/* ── Servicios adicionales ── */}
        {extras.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Servicios adicionales</Text>
            <View style={styles.tableHeader}>
              <Text style={[styles.th, styles.colDesc]}>Descripción</Text>
              <Text style={[styles.th, styles.colDate]}>Fecha</Text>
              <Text style={[styles.th, styles.colAmount]}>Importe</Text>
            </View>
            {extras.map((extra, i) => (
              <View style={styles.row} key={i}>
                <Text style={styles.colDesc}>{extra.description}</Text>
                <Text style={styles.colDate}>{formatDate(extra.date)}</Text>
                <Text style={styles.colAmount}>{formatCurrency(extra.amount)}</Text>
              </View>
            ))}
            <View style={styles.subtotalRow}>
              <Text style={styles.subtotalLabel}>Subtotal servicios</Text>
              <Text style={styles.subtotalValue}>{formatCurrency(extrasTotal)}</Text>
            </View>
          </View>
        )}

        {/* ── Totales ── */}
        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text>Base imponible</Text>
            <Text>{formatCurrency(props.subtotal)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text>IVA (10%)</Text>
            <Text>{formatCurrency(props.tax)}</Text>
          </View>
          <View style={styles.totalFinal}>
            <Text>TOTAL</Text>
            <Text>{formatCurrency(props.total)}</Text>
          </View>
          {props.isPaid !== undefined && (
            <Text style={[styles.statusLine, { color: props.isPaid ? "#059669" : MUTED }]}>
              {props.isPaid ? "Pagada" : "Pendiente de pago"}
            </Text>
          )}
        </View>
      </Page>
    </Document>
  );
}
