import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCallback, useState } from "react";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import * as api from "@/lib/api";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { ScreenHeader } from "@/components/ScreenHeader";
import { formatLongDate, formatMoney } from "@/lib/date";
import { colors } from "@/lib/theme";
import type { Invoice } from "@/lib/types";

export default function InvoiceDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api.fetchInvoice(id);
      setInvoice(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar la factura.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function markPaid() {
    if (!invoice) return;
    setUpdating(true);
    try {
      const res = await api.markInvoicePaid(invoice.id);
      setInvoice(res.data);
    } finally {
      setUpdating(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !invoice) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error ?? "Factura no encontrada."}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 12, paddingLeft: 16 + insets.left, paddingRight: 16 + insets.right },
      ]}
    >
      <ScreenHeader
        eyebrow="Factura"
        title={invoice.invoiceNumber}
        right={
          <Badge
            label={invoice.isPaid ? "Pagada" : "Pendiente"}
            tone={invoice.isPaid ? "green" : "orange"}
          />
        }
        showBack
      />

      <Card>
        <Row label="Huésped" value={`${invoice.booking.guest.firstName} ${invoice.booking.guest.lastName}`} />
        <Row label="Habitación" value={invoice.booking.room?.name ?? invoice.booking.roomType} />
        <Row label="Fecha" value={formatLongDate(invoice.issueDate)} />
      </Card>

      {invoice.extras.length > 0 ? (
        <Card>
          <Text style={styles.sectionTitle}>Extras</Text>
          {invoice.extras.map((extra) => (
            <Row key={extra.id} label={extra.description} value={formatMoney(extra.amount)} />
          ))}
        </Card>
      ) : null}

      <Card>
        <Row label="Subtotal" value={formatMoney(invoice.subtotal)} />
        <Row label="IVA" value={formatMoney(invoice.tax)} />
        <Row label="Total" value={formatMoney(invoice.total)} bold />
      </Card>

      {!invoice.isPaid ? (
        <Button label="Marcar como pagada" loading={updating} onPress={markPaid} />
      ) : null}
    </ScrollView>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, bold && styles.rowValueBold]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  error: {
    color: colors.danger,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  rowLabel: {
    color: colors.textMuted,
    fontSize: 14,
    flexShrink: 1,
  },
  rowValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "500",
  },
  rowValueBold: {
    fontSize: 16,
    fontWeight: "700",
  },
});
