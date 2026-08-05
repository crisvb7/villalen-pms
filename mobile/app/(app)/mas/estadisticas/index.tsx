import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as api from "@/lib/api";
import { Card } from "@/components/Card";
import { ScreenHeader } from "@/components/ScreenHeader";
import { formatMoney } from "@/lib/date";
import { colors, tones, type Tone } from "@/lib/theme";
import type { YearStats } from "@/lib/types";

export default function EstadisticasScreen() {
  const insets = useSafeAreaInsets();
  const [year, setYear] = useState(new Date().getFullYear());
  const [stats, setStats] = useState<YearStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (y: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.fetchStats(y);
      setStats(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar estadísticas.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(year);
    }, [load, year])
  );

  const maxRevenue = stats ? Math.max(1, ...stats.roomPerformance.map((r) => r.revenue)) : 1;
  const maxSource = stats ? Math.max(1, ...stats.bookingsBySource.map((s) => s.count)) : 1;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingLeft: 16 + insets.left, paddingRight: 16 + insets.right }]}
    >
      <ScreenHeader eyebrow="Rendimiento" title="Estadísticas" showBack />

      <View style={styles.yearSelector}>
        <Pressable onPress={() => setYear((y) => y - 1)} style={styles.yearButton}>
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </Pressable>
        <Text style={styles.year}>{year}</Text>
        <Pressable onPress={() => setYear((y) => y + 1)} style={styles.yearButton}>
          <Ionicons name="chevron-forward" size={20} color={colors.text} />
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : error || !stats ? (
        <Text style={styles.error}>{error ?? "Sin datos."}</Text>
      ) : (
        <>
          <View style={styles.totalsRow}>
            <StatTileText label="Ingresos" value={formatMoney(stats.totals.revenue)} tone="green" />
            <StatTileText label="Gastos" value={formatMoney(stats.totals.expenses)} tone="red" />
          </View>
          <View style={styles.totalsRow}>
            <StatTileText label="Neto" value={formatMoney(stats.totals.net)} tone="gray" />
            <StatTileText
              label="Ocupación media"
              value={`${stats.totals.averageOccupancy.toFixed(0)}%`}
              tone="blue"
            />
          </View>

          <Text style={styles.sectionTitle}>Rendimiento por habitación</Text>
          <Card>
            {stats.roomPerformance.length === 0 ? (
              <Text style={styles.emptyText}>Sin reservas este año.</Text>
            ) : (
              stats.roomPerformance.map((room) => (
                <View key={room.roomName} style={styles.barRow}>
                  <View style={styles.barLabelRow}>
                    <Text style={styles.barLabel}>{room.roomName}</Text>
                    <Text style={styles.barValue}>{formatMoney(room.revenue)}</Text>
                  </View>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        { width: `${(room.revenue / maxRevenue) * 100}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.barSubtext}>{room.bookings} reservas</Text>
                </View>
              ))
            )}
          </Card>

          <Text style={styles.sectionTitle}>Reservas por origen</Text>
          <Card>
            {stats.bookingsBySource.length === 0 ? (
              <Text style={styles.emptyText}>Sin reservas este año.</Text>
            ) : (
              stats.bookingsBySource.map((s) => (
                <View key={s.source} style={styles.barRow}>
                  <View style={styles.barLabelRow}>
                    <Text style={styles.barLabel}>{s.source}</Text>
                    <Text style={styles.barValue}>{s.count}</Text>
                  </View>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        styles.barFillAlt,
                        { width: `${(s.count / maxSource) * 100}%` },
                      ]}
                    />
                  </View>
                </View>
              ))
            )}
          </Card>
        </>
      )}
    </ScrollView>
  );
}

function StatTileText({ label, value, tone }: { label: string; value: string; tone: Tone }) {
  const { bg, fg } = tones[tone];
  return (
    <View style={[styles.totalTile, { backgroundColor: bg }]}>
      <Text style={[styles.totalValue, { color: fg }]}>{value}</Text>
      <Text style={[styles.totalLabel, { color: fg }]}>{label}</Text>
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
  error: {
    color: colors.danger,
    textAlign: "center",
    marginTop: 40,
  },
  yearSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
    marginBottom: 20,
  },
  yearButton: {
    padding: 8,
  },
  year: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
    minWidth: 60,
    textAlign: "center",
  },
  totalsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  totalTile: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "700",
  },
  totalLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginTop: 4,
    opacity: 0.85,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase",
    marginTop: 18,
    marginBottom: 10,
  },
  emptyText: {
    color: colors.textMuted,
  },
  barRow: {
    marginBottom: 14,
  },
  barLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  barLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  barValue: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  barTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.background,
    overflow: "hidden",
  },
  barFill: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  barFillAlt: {
    backgroundColor: colors.warning,
  },
  barSubtext: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
  },
});
