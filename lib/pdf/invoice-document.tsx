import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import { ESTABLISHMENT } from "@/lib/establishment";
import { formatDate, formatCurrency, getNights, PAYMENT_METHOD_LABELS } from "@/lib/utils";

const GREEN = "#3F4A34"; // verde-monte, color real de la marca Villalén
const GREEN_LIGHT = "#E3E8DA";
const CREAM = "#F4F1EA"; // hueso
const CREAM_DIM = "#E2DDD1"; // hueso-dim
const INK = "#1C1E17"; // carbon
const MUTED = "#6B7263";
const LINE = "#D8D2C4";

const styles = StyleSheet.create({
  page: { fontSize: 9.5, fontFamily: "Helvetica", color: INK, backgroundColor: CREAM },

  // ── Cabecera con foto ──────────────────────────────────────────────────
  heroWrap: { height: 132, position: "relative" },
  heroImage: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, width: "100%", height: "100%", objectFit: "cover" },
  heroOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: GREEN, opacity: 0.8 },
  heroContent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 22,
  },
  logoBadge: { backgroundColor: "#ffffff", borderRadius: 6, padding: 6, alignSelf: "flex-start" },
  logoImage: { width: 92, height: 40, objectFit: "contain" },
  heroSubtitle: {
    marginTop: 7,
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1.3,
    textTransform: "uppercase",
    color: "#E4E9D9",
  },

  headerRight: { alignItems: "flex-end" },
  statusPillPaid: {
    backgroundColor: "#ffffff",
    color: GREEN,
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 1,
    borderRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  statusPillPending: {
    backgroundColor: "rgba(255,255,255,0.22)",
    color: "#ffffff",
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 1,
    borderRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  docTitle: { fontFamily: "Times-Italic", fontSize: 20, color: "#ffffff", marginTop: 8 },
  docNumber: { fontSize: 9, color: "#D7DEC6", marginTop: 2 },

  // ── Barra de datos fiscales ─────────────────────────────────────────────
  infoBar: { backgroundColor: GREEN, paddingHorizontal: 24, paddingVertical: 10 },
  infoRow: { flexDirection: "row", flexWrap: "wrap", gap: 22, marginBottom: 4 },
  infoItem: { flexDirection: "row" },
  infoLabel: { fontSize: 8, color: "#AEB89D", marginRight: 4 },
  infoValue: { fontSize: 8.5, color: "#ffffff" },

  // ── Cuerpo ──────────────────────────────────────────────────────────────
  body: { flex: 1, padding: 28 },
  twoCol: { flexDirection: "row", justifyContent: "space-between", marginBottom: 14 },
  colLabel: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: GREEN,
    textTransform: "uppercase",
    letterSpacing: 1.1,
    marginBottom: 6,
  },
  clientName: { fontFamily: "Times-Bold", fontSize: 15, color: INK, marginBottom: 4 },
  clientLine: { fontSize: 8.5, color: MUTED, marginBottom: 2 },
  paymentValue: { fontSize: 10, color: INK },
  paymentPending: { fontSize: 9, color: MUTED, fontStyle: "italic" },

  divider: { borderBottom: `1 solid ${LINE}`, marginBottom: 16 },

  sectionLabel: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: GREEN,
    textTransform: "uppercase",
    letterSpacing: 1.1,
    marginTop: 18,
    marginBottom: 6,
  },
  tableHeader: { flexDirection: "row", backgroundColor: GREEN, paddingVertical: 7, paddingHorizontal: 10 },
  th: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: "#ffffff", textTransform: "uppercase", letterSpacing: 0.6 },
  tableRow: { flexDirection: "row", paddingVertical: 9, paddingHorizontal: 10, borderBottom: `1 solid ${LINE}` },
  colDesc: { flex: 2.4 },
  colDate: { flex: 1.5, textAlign: "center" },
  colNights: { flex: 0.8, textAlign: "center" },
  colRate: { flex: 1.1, textAlign: "right" },
  colAmount: { flex: 1.1, textAlign: "right", fontFamily: "Helvetica-Bold" },

  // ── Totales ─────────────────────────────────────────────────────────────
  totals: { marginTop: 18, alignSelf: "flex-end", width: 260 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3, fontSize: 9.5 },
  totalBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: GREEN,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 4,
  },
  totalBoxLabel: { fontFamily: "Times-Italic", fontSize: 13, color: "#ffffff" },
  totalBoxValue: { fontFamily: "Helvetica-Bold", fontSize: 16, color: "#ffffff" },
  statusBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: GREEN_LIGHT,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  statusBarLabel: { fontSize: 8.5, color: GREEN, fontFamily: "Helvetica-Bold" },
  statusBarValue: { fontSize: 8.5, color: INK, fontFamily: "Helvetica-Bold" },

  note: { marginTop: 22, backgroundColor: CREAM_DIM, borderLeft: `3 solid ${GREEN}`, padding: 12 },
  noteText: { fontFamily: "Times-Italic", fontSize: 9.5, color: "#3D4536", lineHeight: 1.4 },

  // ── Pie de página ───────────────────────────────────────────────────────
  footer: {
    borderTop: `1 solid ${LINE}`,
    backgroundColor: CREAM_DIM,
    paddingHorizontal: 24,
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerLeft: { flexDirection: "row", alignItems: "center" },
  footerLogoBadge: { backgroundColor: "#ffffff", borderRadius: 4, padding: 4, marginRight: 8 },
  footerLogoImage: { width: 62, height: 27, objectFit: "contain" },
  footerName: { fontFamily: "Helvetica-Bold", fontSize: 9, color: GREEN },
  footerTagline: { fontSize: 7.5, color: MUTED, marginTop: 1 },
  footerRight: { fontSize: 7.5, color: MUTED },
});

export interface InvoicePdfProps {
  documentTitle: string; // "FACTURA" o "PRESUPUESTO"
  documentNumber: string;
  issueDate: Date | string;
  validUntil?: Date | string;
  subtotal: number | string;
  tax: number | string;
  total: number | string;
  client: { name: string; documentId?: string; email: string; phone?: string | null };
  roomName: string;
  pricePerNight: number | string;
  accommodationTotal?: number | string; // si falta, se asume que el total es solo alojamiento
  checkInDate: Date | string;
  checkOutDate: Date | string;
  extras?: { description: string; amount: number | string; date: Date | string }[];
  isPaid?: boolean;
  paymentMethod?: string; // CASH | CARD | TRANSFER | OTHER
  heroImage?: Buffer;
  logoImage?: Buffer;
}

export function InvoiceDocument(props: InvoicePdfProps) {
  const nights = getNights(props.checkInDate, props.checkOutDate);
  const accommodationTotal = props.accommodationTotal ?? props.total;
  const extras = props.extras ?? [];
  const paymentMethodLabel = props.paymentMethod
    ? PAYMENT_METHOD_LABELS[props.paymentMethod] ?? props.paymentMethod
    : undefined;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* ── Cabecera ── */}
        <View style={styles.heroWrap}>
          {props.heroImage && <Image src={props.heroImage} style={styles.heroImage} />}
          <View style={styles.heroOverlay} />
          <View style={styles.heroContent}>
            <View>
              {props.logoImage && (
                <View style={styles.logoBadge}>
                  <Image src={props.logoImage} style={styles.logoImage} />
                </View>
              )}
              <Text style={styles.heroSubtitle}>
                Casa de aldea · {ESTABLISHMENT.municipality} · {ESTABLISHMENT.province}
              </Text>
            </View>
            <View style={styles.headerRight}>
              {props.isPaid !== undefined && (
                <Text style={props.isPaid ? styles.statusPillPaid : styles.statusPillPending}>
                  {props.isPaid ? "Pagada" : "Pendiente de pago"}
                </Text>
              )}
              <Text style={styles.docTitle}>
                {props.documentTitle.charAt(0)}
                {props.documentTitle.slice(1).toLowerCase()}
              </Text>
              <Text style={styles.docNumber}>{props.documentNumber}</Text>
            </View>
          </View>
        </View>

        {/* ── Datos fiscales ── */}
        <View style={styles.infoBar}>
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Fecha</Text>
              <Text style={styles.infoValue}>{formatDate(props.issueDate)}</Text>
            </View>
            {props.validUntil && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Válido hasta</Text>
                <Text style={styles.infoValue}>{formatDate(props.validUntil)}</Text>
              </View>
            )}
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>CIF</Text>
              <Text style={styles.infoValue}>{ESTABLISHMENT.cif}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Dirección</Text>
              <Text style={styles.infoValue}>
                {ESTABLISHMENT.address}, {ESTABLISHMENT.municipality}, {ESTABLISHMENT.province}
              </Text>
            </View>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{ESTABLISHMENT.email}</Text>
          </View>
        </View>

        {/* ── Cuerpo ── */}
        <View style={styles.body}>
          <View style={styles.twoCol}>
            <View style={{ flex: 1 }}>
              <Text style={styles.colLabel}>Cliente</Text>
              <Text style={styles.clientName}>{props.client.name}</Text>
              {props.client.documentId && (
                <Text style={styles.clientLine}>DNI / NIF: {props.client.documentId}</Text>
              )}
              <Text style={styles.clientLine}>{props.client.email}</Text>
            </View>
            {props.isPaid !== undefined && (
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.colLabel}>Método de pago</Text>
                {paymentMethodLabel ? (
                  <Text style={styles.paymentValue}>{paymentMethodLabel}</Text>
                ) : (
                  <Text style={styles.paymentPending}>Pendiente de pago</Text>
                )}
              </View>
            )}
          </View>
          <View style={styles.divider} />

          {/* Alojamiento */}
          <View style={styles.tableHeader}>
            <Text style={[styles.th, styles.colDesc]}>Concepto</Text>
            <Text style={[styles.th, styles.colDate]}>Fechas</Text>
            <Text style={[styles.th, styles.colNights]}>Noches</Text>
            <Text style={[styles.th, styles.colRate]}>Precio/noche</Text>
            <Text style={[styles.th, styles.colAmount]}>Importe</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.colDesc}>{props.roomName}</Text>
            <Text style={styles.colDate}>
              {formatDate(props.checkInDate)} - {formatDate(props.checkOutDate)}
            </Text>
            <Text style={styles.colNights}>{nights}</Text>
            <Text style={styles.colRate}>{formatCurrency(props.pricePerNight)}</Text>
            <Text style={styles.colAmount}>{formatCurrency(accommodationTotal)}</Text>
          </View>

          {/* Servicios adicionales */}
          {extras.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>Servicios adicionales</Text>
              <View style={styles.tableHeader}>
                <Text style={[styles.th, styles.colDesc]}>Descripción</Text>
                <Text style={[styles.th, styles.colDate]}>Fecha</Text>
                <Text style={[styles.th, styles.colAmount]}>Importe</Text>
              </View>
              {extras.map((extra, i) => (
                <View style={styles.tableRow} key={i}>
                  <Text style={styles.colDesc}>{extra.description}</Text>
                  <Text style={styles.colDate}>{formatDate(extra.date)}</Text>
                  <Text style={styles.colAmount}>{formatCurrency(extra.amount)}</Text>
                </View>
              ))}
            </>
          )}

          {/* Totales */}
          <View style={styles.totals}>
            <View style={styles.totalRow}>
              <Text>Base imponible</Text>
              <Text>{formatCurrency(props.subtotal)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text>IVA (10%)</Text>
              <Text>{formatCurrency(props.tax)}</Text>
            </View>
            <View style={styles.totalBox}>
              <Text style={styles.totalBoxLabel}>Total</Text>
              <Text style={styles.totalBoxValue}>{formatCurrency(props.total)}</Text>
            </View>
            {props.isPaid !== undefined && (
              <View style={styles.statusBar}>
                <Text style={styles.statusBarLabel}>{props.isPaid ? "Pagada" : "Pendiente de pago"}</Text>
                {paymentMethodLabel && <Text style={styles.statusBarValue}>{paymentMethodLabel}</Text>}
              </View>
            )}
          </View>

          {/* Nota de agradecimiento */}
          {props.documentTitle === "FACTURA" && (
            <View style={styles.note}>
              <Text style={styles.noteText}>
                Gracias por elegir {ESTABLISHMENT.name}. Esperamos que su estancia haya sido de su agrado. Le
                esperamos de nuevo en {ESTABLISHMENT.province}.
              </Text>
            </View>
          )}
        </View>

        {/* ── Pie de página ── */}
        <View style={styles.footer}>
          <View style={styles.footerLeft}>
            {props.logoImage && (
              <View style={styles.footerLogoBadge}>
                <Image src={props.logoImage} style={styles.footerLogoImage} />
              </View>
            )}
            <View>
              <Text style={styles.footerName}>{ESTABLISHMENT.name}</Text>
              <Text style={styles.footerTagline}>
                Casa de aldea · {ESTABLISHMENT.municipality}, {ESTABLISHMENT.province}
              </Text>
            </View>
          </View>
          <Text style={styles.footerRight}>
            {props.documentNumber} · {ESTABLISHMENT.cif} · {ESTABLISHMENT.email}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
