// lib/pdf/invoice-document.tsx
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { ESTABLISHMENT } from "@/lib/establishment";
import { formatDate, formatCurrency, getNights } from "@/lib/utils";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#292524" },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
  title: { fontSize: 20, marginBottom: 4 },
  muted: { color: "#78716c" },
  section: { marginBottom: 16 },
  label: { fontSize: 8, textTransform: "uppercase", letterSpacing: 1, color: "#78716c", marginBottom: 2 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, borderBottom: "1 solid #e7e5e4" },
  tableHeader: { flexDirection: "row", borderBottom: "1 solid #292524", paddingBottom: 4, marginBottom: 4 },
  col: { flex: 1 },
  colRight: { flex: 1, textAlign: "right" },
  totals: { marginTop: 12, alignSelf: "flex-end", width: 220 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  totalFinal: { flexDirection: "row", justifyContent: "space-between", paddingTop: 6, marginTop: 4, borderTop: "1 solid #292524", fontSize: 12 },
});

export interface InvoicePdfProps {
  documentTitle: string; // "FACTURA" o "PRESUPUESTO"
  documentNumber: string;
  issueDate: Date | string;
  validUntil?: Date | string;
  subtotal: number | string;
  tax: number | string;
  total: number | string;
  client: { name: string; documentId?: string; email: string };
  roomName: string;
  pricePerNight: number | string;
  checkInDate: Date | string;
  checkOutDate: Date | string;
  isPaid?: boolean;
}

export function InvoiceDocument(props: InvoicePdfProps) {
  const nights = getNights(props.checkInDate, props.checkOutDate);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{props.documentTitle}</Text>
            <Text style={styles.muted}>Nº {props.documentNumber}</Text>
            <Text style={styles.muted}>Fecha: {formatDate(props.issueDate)}</Text>
            {props.validUntil && (
              <Text style={styles.muted}>Válido hasta: {formatDate(props.validUntil)}</Text>
            )}
          </View>
          <View style={{ textAlign: "right" }}>
            <Text>{ESTABLISHMENT.name}</Text>
            <Text style={styles.muted}>{ESTABLISHMENT.cif}</Text>
            <Text style={styles.muted}>{ESTABLISHMENT.address}</Text>
            <Text style={styles.muted}>
              {ESTABLISHMENT.municipality}, {ESTABLISHMENT.province}
            </Text>
            {ESTABLISHMENT.email ? <Text style={styles.muted}>{ESTABLISHMENT.email}</Text> : null}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Cliente</Text>
          <Text>{props.client.name}</Text>
          {props.client.documentId && <Text style={styles.muted}>{props.client.documentId}</Text>}
          <Text style={styles.muted}>{props.client.email}</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.tableHeader}>
            <Text style={styles.col}>Concepto</Text>
            <Text style={styles.colRight}>Noches</Text>
            <Text style={styles.colRight}>Precio/noche</Text>
            <Text style={styles.colRight}>Importe</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.col}>{props.roomName}</Text>
            <Text style={styles.colRight}>{nights}</Text>
            <Text style={styles.colRight}>{formatCurrency(props.pricePerNight)}</Text>
            <Text style={styles.colRight}>{formatCurrency(props.subtotal)}</Text>
          </View>
          <Text style={[styles.muted, { marginTop: 4 }]}>
            {formatDate(props.checkInDate)} → {formatDate(props.checkOutDate)}
          </Text>
        </View>

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
            <Text>Total</Text>
            <Text>{formatCurrency(props.total)}</Text>
          </View>
          {props.isPaid !== undefined && (
            <Text style={[styles.muted, { marginTop: 6, textAlign: "right" }]}>
              {props.isPaid ? "✓ Pagada" : "Pendiente de pago"}
            </Text>
          )}
        </View>
      </Page>
    </Document>
  );
}
