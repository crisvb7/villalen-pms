import { useCallback, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as api from "@/lib/api";
import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { ScreenHeader } from "@/components/ScreenHeader";
import { formatMoney, formatShortDate } from "@/lib/date";
import { colors, fonts } from "@/lib/theme";
import type { Invoice } from "@/lib/types";

export default function FacturasScreen() {
  const insets = useSafeAreaInsets();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api.fetchInvoices();
      setInvoices(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar facturas.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={invoices}
        keyExtractor={(i) => i.id}
        contentContainerStyle={[styles.list, { paddingLeft: 16 + insets.left, paddingRight: 16 + insets.right }]}
        ListHeaderComponent={
          <View style={{ paddingTop: insets.top + 12 }}>
            <ScreenHeader eyebrow="Gestión" title="Facturas" showBack />
          </View>
        }
        renderItem={({ item }) => (
          <Card onPress={() => router.push(`/mas/facturas/${item.id}`)}>
            <View style={styles.row}>
              <Text style={styles.number}>{item.invoiceNumber}</Text>
              <Badge
                label={item.isPaid ? "Pagada" : "Pendiente"}
                tone={item.isPaid ? "green" : "orange"}
              />
            </View>
            <Text style={styles.guest}>
              {item.booking.guest.firstName} {item.booking.guest.lastName}
            </Text>
            <Text style={styles.meta}>{formatShortDate(item.issueDate)}</Text>
            <Text style={styles.amount}>{formatMoney(item.total)}</Text>
          </Card>
        )}
        ListEmptyComponent={<EmptyState icon="document-text-outline" text="No hay facturas." />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  error: {
    color: colors.danger,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  list: {
    padding: 16,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  number: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textMuted,
  },
  guest: {
    fontFamily: fonts.serifSemiBold,
    fontSize: 16,
    color: colors.text,
    marginBottom: 4,
  },
  meta: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 6,
  },
  amount: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.primary,
  },
});
