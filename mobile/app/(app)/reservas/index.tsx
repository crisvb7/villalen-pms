import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as api from "@/lib/api";
import { BookingCard } from "@/components/BookingCard";
import { CalendarView } from "@/components/calendar/CalendarView";
import { ScreenHeader } from "@/components/ScreenHeader";
import { colors, statusLabels } from "@/lib/theme";
import type { Booking, BookingStatus } from "@/lib/types";

const FILTERS: { label: string; value: BookingStatus | "ALL" }[] = [
  { label: "Todas", value: "ALL" },
  { label: statusLabels.PENDING, value: "PENDING" },
  { label: statusLabels.CONFIRMED, value: "CONFIRMED" },
  { label: statusLabels.CHECKED_IN, value: "CHECKED_IN" },
  { label: statusLabels.CHECKED_OUT, value: "CHECKED_OUT" },
];

type ViewMode = "CALENDAR" | "LIST";

export default function ReservasScreen() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const [viewMode, setViewMode] = useState<ViewMode>("CALENDAR");

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.headerWrap,
          {
            paddingTop: insets.top + (isLandscape ? 6 : 12),
            paddingLeft: 16 + insets.left,
            paddingRight: 16 + insets.right,
          },
        ]}
      >
        {isLandscape ? null : <ScreenHeader eyebrow="Gestión" title="Reservas" />}

        <View style={[styles.segment, isLandscape && styles.segmentCompact]}>
          <Pressable
            style={[styles.segmentOption, viewMode === "CALENDAR" && styles.segmentOptionActive]}
            onPress={() => setViewMode("CALENDAR")}
          >
            <Text style={[styles.segmentText, viewMode === "CALENDAR" && styles.segmentTextActive]}>
              Calendario
            </Text>
          </Pressable>
          <Pressable
            style={[styles.segmentOption, viewMode === "LIST" && styles.segmentOptionActive]}
            onPress={() => setViewMode("LIST")}
          >
            <Text style={[styles.segmentText, viewMode === "LIST" && styles.segmentTextActive]}>
              Lista
            </Text>
          </Pressable>
        </View>
      </View>

      {viewMode === "CALENDAR" ? <CalendarView /> : <ReservasList />}
    </View>
  );
}

function ReservasList() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filter, setFilter] = useState<BookingStatus | "ALL">("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (status: BookingStatus | "ALL") => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.fetchBookings(status === "ALL" ? undefined : status);
      setBookings(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar reservas.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(filter);
    }, [load, filter])
  );

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.filters}>
        <FlatList
          horizontal
          data={FILTERS}
          keyExtractor={(f) => f.value}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => setFilter(item.value)}
              style={[styles.chip, filter === item.value && styles.chipActive]}
            >
              <Text
                style={[
                  styles.chipText,
                  filter === item.value && styles.chipTextActive,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          )}
        />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.error}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(b) => b.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => <BookingCard booking={item} />}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No hay reservas para este filtro.</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerWrap: {
    paddingHorizontal: 16,
    backgroundColor: colors.background,
  },
  segment: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 4,
    marginBottom: 14,
  },
  segmentCompact: {
    marginBottom: 6,
  },
  segmentOption: {
    flex: 1,
    paddingVertical: 9,
    alignItems: "center",
    borderRadius: 8,
  },
  segmentOptionActive: {
    backgroundColor: colors.primary,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textMuted,
  },
  segmentTextActive: {
    color: colors.primaryText,
  },
  filters: {
    paddingVertical: 12,
    backgroundColor: colors.background,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: "500",
  },
  chipTextActive: {
    color: colors.primaryText,
  },
  list: {
    padding: 16,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  error: {
    color: colors.danger,
  },
  emptyText: {
    color: colors.textMuted,
    textAlign: "center",
    marginTop: 32,
  },
});
