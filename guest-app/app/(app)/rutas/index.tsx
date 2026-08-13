// app/(app)/rutas/index.tsx
// Lista de rutas — contenido real gestionado desde /admin/rutas en la web.
// Suelen ser pocas rutas (una guía de una casa de aldea, no un catálogo),
// así que un ScrollView normal es suficiente, no hace falta FlatList.

import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card } from "@/components/Card";
import * as api from "@/lib/api";
import { formatDurationMin } from "@/lib/date";
import { DIFFICULTY_COLORS, DIFFICULTY_LABELS, getRouteIcon } from "@/lib/route-display";
import { colors, fonts, radii, spacing } from "@/lib/theme";
import type { GuestRoute } from "@/lib/types";

export default function RutasScreen() {
  const insets = useSafeAreaInsets();
  const [routes, setRoutes] = useState<GuestRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.fetchRoutes();
      setRoutes(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar las rutas.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  if (loading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.center, { paddingTop: insets.top, paddingHorizontal: spacing.lg }]}>
        <Ionicons name="cloud-offline-outline" size={32} color={colors.textMuted} />
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  const featured = routes.find((r) => r.isCaminoStage);
  const rest = routes.filter((r) => !r.isCaminoStage);

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + spacing.lg,
        paddingBottom: insets.bottom + spacing.xl,
        paddingHorizontal: spacing.lg,
      }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      <Text style={styles.title}>Rutas</Text>
      <Text style={styles.subtitle}>Senderismo alrededor de Villalén</Text>

      {routes.length === 0 && (
        <View style={styles.empty}>
          <Ionicons name="map-outline" size={32} color={colors.textMuted} />
          <Text style={styles.emptyText}>Todavía no hay rutas publicadas.</Text>
        </View>
      )}

      {featured && (
        <Link href={`/rutas/${featured.id}`} asChild>
          <Pressable style={styles.featured}>
            {featured.imageUrl ? (
              <>
                <Image
                  source={{ uri: featured.imageUrl }}
                  style={StyleSheet.absoluteFill}
                  contentFit="cover"
                />
                <View style={[StyleSheet.absoluteFill, styles.featuredScrim]} />
              </>
            ) : (
              <View style={styles.featuredIconWrap}>
                <Ionicons name={getRouteIcon(featured.icon)} size={32} color="#FFFFFF" />
              </View>
            )}
            <View style={styles.featuredBadge}>
              <Text style={styles.featuredBadgeText}>{featured.category}</Text>
            </View>
            <Text style={styles.featuredName}>{featured.name}</Text>
            <Text style={styles.featuredMeta}>
              {featured.distanceKm} km · {formatDurationMin(featured.durationMin)} ·{" "}
              {DIFFICULTY_LABELS[featured.difficulty]}
            </Text>
          </Pressable>
        </Link>
      )}

      {rest.length > 0 && <Text style={styles.sectionLabel}>Más rutas cercanas</Text>}
      <View style={{ gap: spacing.sm }}>
        {rest.map((route) => {
          const diff = DIFFICULTY_COLORS[route.difficulty];
          return (
            <Link key={route.id} href={`/rutas/${route.id}`} asChild>
              <Pressable>
                <Card style={styles.row}>
                  {route.imageUrl ? (
                    <Image source={{ uri: route.imageUrl }} style={styles.rowIcon} contentFit="cover" />
                  ) : (
                    <View style={styles.rowIcon}>
                      <Ionicons name={getRouteIcon(route.icon)} size={20} color={colors.primary} />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowCategory}>{route.category}</Text>
                    <Text style={styles.rowName}>{route.name}</Text>
                    <View style={styles.rowMetaRow}>
                      <Text style={styles.rowMeta}>
                        {route.distanceKm} km · {formatDurationMin(route.durationMin)}
                      </Text>
                      <View style={[styles.difficultyPill, { backgroundColor: diff.bg }]}>
                        <Text style={[styles.difficultyText, { color: diff.fg }]}>
                          {DIFFICULTY_LABELS[route.difficulty]}
                        </Text>
                      </View>
                    </View>
                  </View>
                </Card>
              </Pressable>
            </Link>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.sm },
  errorText: { fontFamily: fonts.sansRegular, fontSize: 14, color: colors.textMuted, textAlign: "center" },
  empty: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.xl },
  emptyText: { fontFamily: fonts.sansRegular, fontSize: 14, color: colors.textMuted },
  title: { fontFamily: fonts.serifBold, fontSize: 28, color: colors.text },
  subtitle: { fontFamily: fonts.sansRegular, fontSize: 14, color: colors.textMuted, marginTop: 2 },
  sectionLabel: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: colors.textMuted,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  featured: {
    marginTop: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.primary,
    padding: spacing.lg,
    overflow: "hidden",
  },
  featuredScrim: {
    backgroundColor: "rgba(28,25,23,0.4)",
  },
  featuredIconWrap: {
    width: 56,
    height: 56,
    borderRadius: radii.md,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  featuredBadge: {
    alignSelf: "flex-start",
    backgroundColor: colors.accent,
    borderRadius: radii.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: spacing.sm,
  },
  featuredBadgeText: { fontFamily: fonts.sansSemiBold, fontSize: 11, color: "#FFFFFF" },
  featuredName: { fontFamily: fonts.serifBold, fontSize: 22, color: "#FFFFFF", lineHeight: 27 },
  featuredMeta: { fontFamily: fonts.sansMedium, fontSize: 13, color: "rgba(255,255,255,0.85)", marginTop: 6 },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: colors.primarySurface,
    alignItems: "center",
    justifyContent: "center",
  },
  rowCategory: { fontFamily: fonts.sansMedium, fontSize: 11, color: colors.textMuted, textTransform: "uppercase" },
  rowName: { fontFamily: fonts.sansSemiBold, fontSize: 15, color: colors.text, marginTop: 2 },
  rowMetaRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: 4 },
  rowMeta: { fontFamily: fonts.sansRegular, fontSize: 12, color: colors.textMuted },
  difficultyPill: { borderRadius: radii.full, paddingHorizontal: 8, paddingVertical: 2 },
  difficultyText: { fontFamily: fonts.sansSemiBold, fontSize: 11 },
});
