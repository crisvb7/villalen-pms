// app/(app)/rutas/index.tsx
// Punto de entrada de "Rutas": categorías, no el listado directo — con
// muchas rutas (senderismo, Camino, costa, cultural…) enseñarlas todas de
// golpe sería un muro; el huésped elige qué tipo de plan busca primero.
// El listado de cada categoría vive en rutas/categoria/[category].tsx.

import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as api from "@/lib/api";
import { getRouteIcon } from "@/lib/route-display";
import { colors, fonts, radii, spacing } from "@/lib/theme";
import type { GuestRoute } from "@/lib/types";

interface CategoryGroup {
  category: string;
  count: number;
  coverImageUrl: string | null;
  icon: string;
}

function groupByCategory(routes: GuestRoute[]): CategoryGroup[] {
  const map = new Map<string, GuestRoute[]>();
  for (const route of routes) {
    const list = map.get(route.category) ?? [];
    list.push(route);
    map.set(route.category, list);
  }
  return Array.from(map.entries())
    .map(([category, list]) => ({
      category,
      count: list.length,
      coverImageUrl: list.find((r) => r.imageUrl)?.imageUrl ?? null,
      icon: list[0].icon,
    }))
    .sort((a, b) => a.category.localeCompare(b.category, "es"));
}

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

  const groups = groupByCategory(routes);

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
      <Text style={styles.subtitle}>Senderismo y planes alrededor de Villalén</Text>

      {groups.length === 0 && (
        <View style={styles.empty}>
          <Ionicons name="map-outline" size={32} color={colors.textMuted} />
          <Text style={styles.emptyText}>Todavía no hay rutas publicadas.</Text>
        </View>
      )}

      <View style={{ gap: spacing.md, marginTop: spacing.lg }}>
        {groups.map((group) => (
          <Link
            key={group.category}
            href={{ pathname: "/rutas/categoria/[category]", params: { category: group.category } }}
            asChild
          >
            <Pressable style={styles.card}>
              {group.coverImageUrl ? (
                <>
                  <Image
                    source={{ uri: group.coverImageUrl }}
                    style={StyleSheet.absoluteFill}
                    contentFit="cover"
                  />
                  <View style={[StyleSheet.absoluteFill, styles.scrim]} />
                </>
              ) : (
                <View style={styles.iconWrap}>
                  <Ionicons name={getRouteIcon(group.icon)} size={28} color="#FFFFFF" />
                </View>
              )}
              <View style={styles.cardFooter}>
                <Text style={styles.cardName}>{group.category}</Text>
                <Text style={styles.cardMeta}>
                  {group.count} ruta{group.count !== 1 ? "s" : ""}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#FFFFFF" style={styles.chevron} />
            </Pressable>
          </Link>
        ))}
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
  card: {
    borderRadius: radii.lg,
    backgroundColor: colors.primary,
    minHeight: 110,
    padding: spacing.lg,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  scrim: { backgroundColor: "rgba(28,25,23,0.35)" },
  iconWrap: {
    position: "absolute",
    top: spacing.lg,
    left: spacing.lg,
    width: 48,
    height: 48,
    borderRadius: radii.md,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardFooter: { paddingRight: spacing.xl },
  cardName: { fontFamily: fonts.serifBold, fontSize: 20, color: "#FFFFFF" },
  cardMeta: { fontFamily: fonts.sansMedium, fontSize: 12, color: "rgba(255,255,255,0.85)", marginTop: 2 },
  chevron: { position: "absolute", right: spacing.lg, bottom: spacing.lg },
});
