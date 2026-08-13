// app/(app)/rutas/categoria/[category].tsx
// Rutas de una categoría, todas con el mismo tratamiento de tarjeta grande
// (ver RouteCard) — ordenables por nombre (por defecto), cercanía al hotel,
// duración o dificultad.

import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BackButton } from "@/components/BackButton";
import { RouteCard } from "@/components/RouteCard";
import * as api from "@/lib/api";
import { colors, fonts, radii, spacing } from "@/lib/theme";
import type { GuestRoute } from "@/lib/types";

type SortKey = "name" | "distanceFromHotel" | "duration" | "difficulty";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "name", label: "Nombre" },
  { key: "distanceFromHotel", label: "Distancia al hotel" },
  { key: "duration", label: "Duración" },
  { key: "difficulty", label: "Dificultad" },
];

const DIFFICULTY_RANK: Record<GuestRoute["difficulty"], number> = {
  EASY: 0,
  MODERATE: 1,
  HARD: 2,
};

function sortRoutes(routes: GuestRoute[], sortBy: SortKey): GuestRoute[] {
  const copy = [...routes];
  switch (sortBy) {
    case "distanceFromHotel":
      return copy.sort((a, b) => {
        const da = a.distanceFromHotelKm ? parseFloat(a.distanceFromHotelKm) : Infinity;
        const db = b.distanceFromHotelKm ? parseFloat(b.distanceFromHotelKm) : Infinity;
        return da - db;
      });
    case "duration":
      return copy.sort((a, b) => a.durationMin - b.durationMin);
    case "difficulty":
      return copy.sort((a, b) => DIFFICULTY_RANK[a.difficulty] - DIFFICULTY_RANK[b.difficulty]);
    case "name":
    default:
      return copy.sort((a, b) => a.name.localeCompare(b.name, "es"));
  }
}

export default function CategoryRoutesScreen() {
  const insets = useSafeAreaInsets();
  const { category } = useLocalSearchParams<{ category: string }>();
  const [routes, setRoutes] = useState<GuestRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>("name");

  const load = useCallback(async () => {
    try {
      const { data } = await api.fetchRoutes();
      setRoutes(data.filter((r) => r.category === category));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar las rutas.");
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    load();
  }, [load]);

  const sorted = sortRoutes(routes, sortBy);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.backFloating, { top: insets.top + spacing.sm }]}>
        <BackButton variant="solid" />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : error ? (
        <View style={[styles.center, { paddingHorizontal: spacing.lg }]}>
          <Ionicons name="cloud-offline-outline" size={32} color={colors.textMuted} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{
            paddingTop: insets.top + spacing.xl + spacing.sm,
            paddingBottom: insets.bottom + spacing.xl,
            paddingHorizontal: spacing.lg,
          }}
        >
          <Text style={styles.title}>{category}</Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: spacing.md }}>
            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              {SORT_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.key}
                  onPress={() => setSortBy(opt.key)}
                  style={[styles.chip, sortBy === opt.key && styles.chipActive]}
                >
                  <Text style={[styles.chipText, sortBy === opt.key && styles.chipTextActive]}>
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          {sorted.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="map-outline" size={32} color={colors.textMuted} />
              <Text style={styles.emptyText}>No hay rutas publicadas en esta categoría.</Text>
            </View>
          ) : (
            <View style={{ gap: spacing.md, marginTop: spacing.lg }}>
              {sorted.map((route) => (
                <RouteCard key={route.id} route={route} />
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  backFloating: { position: "absolute", left: spacing.lg, zIndex: 10 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.sm },
  errorText: { fontFamily: fonts.sansRegular, fontSize: 14, color: colors.textMuted, textAlign: "center" },
  empty: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.xl },
  emptyText: { fontFamily: fonts.sansRegular, fontSize: 14, color: colors.textMuted, textAlign: "center" },
  title: { fontFamily: fonts.serifBold, fontSize: 28, color: colors.text },
  chip: {
    borderRadius: radii.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.textMuted },
  chipTextActive: { color: "#FFFFFF" },
});
