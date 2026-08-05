// app/(app)/index.tsx
// Resumen del día: entradas, salidas y estado de limpieza.

import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as api from "@/lib/api";
import { Avatar } from "@/components/Avatar";
import { BookingCard } from "@/components/BookingCard";
import { StatTile } from "@/components/StatTile";
import { useAuth } from "@/lib/auth-context";
import { formatLongDate, isSameDayAsToday } from "@/lib/date";
import { colors, fonts } from "@/lib/theme";
import type { Booking, CleaningRoom } from "@/lib/types";

export default function DashboardScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [cleaning, setCleaning] = useState<CleaningRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [bookingsRes, cleaningRes] = await Promise.all([
        api.fetchBookings(),
        api.fetchCleaningStatus(),
      ]);
      setBookings(bookingsRes.data);
      setCleaning(cleaningRes.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const arrivals = bookings.filter(
    (b) => isSameDayAsToday(b.checkInDate) && b.status !== "CANCELLED"
  );
  const departures = bookings.filter(
    (b) => isSameDayAsToday(b.checkOutDate) && b.status !== "CANCELLED"
  );
  const dirtyRooms = cleaning.filter((r) => !r.isClean);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingLeft: 16 + insets.left, paddingRight: 16 + insets.right }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
        />
      }
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.date}>{formatLongDate(new Date().toISOString())}</Text>
          <Text style={styles.greeting}>Hola, {user?.name?.split(" ")[0] ?? ""}</Text>
        </View>
        <Avatar name={user?.name ?? "?"} size={44} />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.summaryRow}>
        <StatTile label="Entradas" value={arrivals.length} tone="green" />
        <StatTile label="Salidas" value={departures.length} tone="orange" />
        <StatTile label="Por limpiar" value={dirtyRooms.length} tone="blue" />
      </View>

      <Text style={styles.sectionTitle}>Entradas de hoy</Text>
      {arrivals.length === 0 ? (
        <Text style={styles.emptyText}>No hay entradas hoy.</Text>
      ) : (
        arrivals.map((b) => <BookingCard key={b.id} booking={b} />)
      )}

      <Text style={styles.sectionTitle}>Salidas de hoy</Text>
      {departures.length === 0 ? (
        <Text style={styles.emptyText}>No hay salidas hoy.</Text>
      ) : (
        departures.map((b) => <BookingCard key={b.id} booking={b} />)
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
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  date: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 2,
  },
  greeting: {
    fontFamily: fonts.serifBold,
    fontSize: 26,
    color: colors.text,
  },
  error: {
    color: colors.danger,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: colors.textMuted,
    marginTop: 8,
    marginBottom: 10,
  },
  emptyText: {
    color: colors.textMuted,
    marginBottom: 16,
  },
});
