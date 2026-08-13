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
import { colors, quoteStatusLabels, quoteStatusTones } from "@/lib/theme";
import type { Quote, QuoteStatus } from "@/lib/types";

const ACTIONS: Partial<Record<QuoteStatus, { label: string; next: QuoteStatus; variant: "primary" | "danger" }[]>> = {
  DRAFT: [{ label: "Marcar como enviado", next: "SENT", variant: "primary" }],
  SENT: [
    { label: "Marcar como aceptado", next: "ACCEPTED", variant: "primary" },
    { label: "Marcar como rechazado", next: "REJECTED", variant: "danger" },
  ],
};

export default function QuoteDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api.fetchQuote(id);
      setQuote(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar el presupuesto.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function changeStatus(status: QuoteStatus) {
    if (!quote) return;
    setUpdating(true);
    try {
      const res = await api.updateQuoteStatus(quote.id, status);
      setQuote(res.data);
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

  if (error || !quote) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error ?? "Presupuesto no encontrado."}</Text>
      </View>
    );
  }

  const actions = ACTIONS[quote.status] ?? [];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 12, paddingLeft: 16 + insets.left, paddingRight: 16 + insets.right },
      ]}
    >
      <ScreenHeader
        eyebrow="Presupuesto"
        title={quote.quoteNumber}
        right={
          <Badge
            label={quoteStatusLabels[quote.status] ?? quote.status}
            tone={quoteStatusTones[quote.status] ?? "gray"}
          />
        }
        showBack
      />

      <Card>
        <Row label="Cliente" value={quote.guestName} />
        <Row label="Email" value={quote.guestEmail} />
        {quote.guestPhone ? <Row label="Teléfono" value={quote.guestPhone} /> : null}
      </Card>

      <Card>
        <Row label="Habitación" value={quote.roomName} />
        <Row label="Entrada" value={formatLongDate(quote.checkInDate)} />
        <Row label="Salida" value={formatLongDate(quote.checkOutDate)} />
        <Row label="Precio/noche" value={formatMoney(quote.pricePerNight)} />
        <Row label="Válido hasta" value={formatLongDate(quote.validUntil)} />
      </Card>

      <Card>
        <Row label="Subtotal" value={formatMoney(quote.subtotal)} />
        <Row label="IVA" value={formatMoney(quote.tax)} />
        <Row label="Total" value={formatMoney(quote.total)} bold />
      </Card>

      {quote.notes ? (
        <Card>
          <Text style={styles.notes}>{quote.notes}</Text>
        </Card>
      ) : null}

      {actions.length > 0 ? (
        <View style={styles.actions}>
          {actions.map((a) => (
            <Button
              key={a.next}
              label={a.label}
              variant={a.variant}
              loading={updating}
              onPress={() => changeStatus(a.next)}
            />
          ))}
        </View>
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
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  rowLabel: {
    color: colors.textMuted,
    fontSize: 14,
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
  notes: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    gap: 10,
    marginTop: 8,
  },
});
