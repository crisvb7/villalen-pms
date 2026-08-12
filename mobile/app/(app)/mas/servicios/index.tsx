import { useCallback, useState } from "react";
import { useFocusEffect, router } from "expo-router";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as api from "@/lib/api";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { ScreenHeader } from "@/components/ScreenHeader";
import { colors, fonts } from "@/lib/theme";
import type { GuestServiceType, TodayBoardRow } from "@/lib/types";

const SERVICE_META: { type: GuestServiceType; label: string; icon: string }[] = [
  { type: "BREAKFAST", label: "Desayuno", icon: "🍳" },
  { type: "DINNER", label: "Cena", icon: "🍽️" },
  { type: "CLEANING", label: "Limpieza", icon: "🧹" },
];

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setUTCDate(d.getUTCDate() + days);
  return toISODate(d);
}

function formatBoardDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
}

export default function ServiciosHoyScreen() {
  const insets = useSafeAreaInsets();
  const [date, setDate] = useState(() => toISODate(new Date()));
  const [rows, setRows] = useState<TodayBoardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [dinnerEnabled, setDinnerEnabled] = useState<boolean | null>(null);
  const [savingDinnerSetting, setSavingDinnerSetting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [boardRes, settingsRes] = await Promise.all([
        api.fetchTodayServicesBoard(date),
        api.fetchHotelSettings(),
      ]);
      setRows(boardRes.data);
      setDinnerEnabled(settingsRes.data.dinnerServiceEnabled);
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "No se pudo cargar el tablón.");
    } finally {
      setLoading(false);
    }
  }, [date]);

  async function toggleDinnerService() {
    if (dinnerEnabled === null) return;
    const next = !dinnerEnabled;
    setSavingDinnerSetting(true);
    try {
      await api.setDinnerServiceEnabled(next);
      setDinnerEnabled(next);
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "No se pudo guardar el ajuste.");
    } finally {
      setSavingDinnerSetting(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function toggle(bookingId: string, type: GuestServiceType, next: boolean) {
    const key = `${bookingId}-${type}`;
    setToggling(key);
    try {
      await api.setBookingService(bookingId, date, type, next);
      setRows((prev) =>
        prev.map((r) =>
          r.bookingId === bookingId ? { ...r, requests: { ...r.requests, [type]: next } } : r
        )
      );
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "No se pudo actualizar.");
    } finally {
      setToggling(null);
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingLeft: 16 + insets.left, paddingRight: 16 + insets.right }]}
    >
      <ScreenHeader eyebrow="Operativa" title="Servicios del día" showBack />

      <Card style={styles.dinnerCard}>
        <View style={styles.dinnerRow}>
          <View style={styles.dinnerInfo}>
            <Text style={styles.dinnerTitle}>🍽️ Cena (temporada peregrinos)</Text>
            <Text style={styles.dinnerSubtitle}>
              {dinnerEnabled === false ? "Apagada" : "Encendida"}
            </Text>
          </View>
          <Pressable
            disabled={dinnerEnabled === null || savingDinnerSetting}
            onPress={toggleDinnerService}
            style={[
              styles.chip,
              dinnerEnabled ? styles.chipActive : styles.chipInactive,
              (dinnerEnabled === null || savingDinnerSetting) && styles.chipDisabled,
            ]}
          >
            <Text style={dinnerEnabled ? styles.chipTextActive : styles.chipText}>
              {dinnerEnabled ? "Apagar" : "Encender"}
            </Text>
          </Pressable>
        </View>
      </Card>

      <View style={styles.dateNav}>
        <Pressable style={styles.dateArrow} onPress={() => setDate((d) => addDays(d, -1))} hitSlop={8}>
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </Pressable>
        <Text style={styles.dateLabel}>{formatBoardDate(date)}</Text>
        <Pressable style={styles.dateArrow} onPress={() => setDate((d) => addDays(d, 1))} hitSlop={8}>
          <Ionicons name="chevron-forward" size={20} color={colors.text} />
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : rows.length === 0 ? (
        <EmptyState icon="cafe-outline" text="No hay reservas activas ese día." />
      ) : (
        rows.map((row) => (
          <Card key={row.bookingId} onPress={() => router.push(`/reservas/${row.bookingId}`)}>
            <Text style={styles.roomName}>{row.roomName}</Text>
            <Text style={styles.guestName}>{row.guestName}</Text>
            <View style={styles.chips}>
              {SERVICE_META.map((meta) => {
                const active = row.requests[meta.type];
                const key = `${row.bookingId}-${meta.type}`;
                return (
                  <Pressable
                    key={meta.type}
                    disabled={toggling === key}
                    onPress={() => toggle(row.bookingId, meta.type, !active)}
                    style={[
                      styles.chip,
                      active ? styles.chipActive : styles.chipInactive,
                      toggling === key && styles.chipDisabled,
                    ]}
                  >
                    <Text style={active ? styles.chipTextActive : styles.chipText}>
                      {meta.icon} {meta.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Card>
        ))
      )}
    </ScrollView>
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
  dinnerCard: {
    marginBottom: 16,
  },
  dinnerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  dinnerInfo: {
    flexShrink: 1,
  },
  dinnerTitle: {
    fontFamily: fonts.serifSemiBold,
    fontSize: 15,
    color: colors.text,
  },
  dinnerSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  dateNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  dateArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  dateLabel: {
    fontFamily: fonts.serifSemiBold,
    fontSize: 16,
    color: colors.text,
    textTransform: "capitalize",
  },
  roomName: {
    fontFamily: fonts.serifSemiBold,
    fontSize: 16,
    color: colors.text,
  },
  guestName: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
    marginBottom: 10,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  chipActive: {
    backgroundColor: "#D1FAE5",
    borderColor: "#A7F3D0",
  },
  chipInactive: {
    backgroundColor: colors.background,
    borderColor: colors.border,
  },
  chipDisabled: {
    opacity: 0.6,
  },
  chipText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
  },
  chipTextActive: {
    color: "#065F46",
    fontSize: 12,
    fontWeight: "700",
  },
});
