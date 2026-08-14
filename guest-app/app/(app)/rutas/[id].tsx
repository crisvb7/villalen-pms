// app/(app)/rutas/[id].tsx

import { useEffect, useState } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BackButton } from "@/components/BackButton";
import * as api from "@/lib/api";
import { DIFFICULTY_COLORS, DIFFICULTY_LABELS, getRouteIcon } from "@/lib/route-display";
import { colors, fonts, radii, spacing } from "@/lib/theme";
import type { GuestRoute } from "@/lib/types";

// Sin origin: Google Maps usa la ubicación actual del huésped como punto de
// partida. Las paradas intermedias van como waypoints, en orden; la última
// es el destino.
function buildGoogleMapsUrl(route: GuestRoute): string | null {
  if (!route.stops || route.stops.length === 0) return null;
  const points = [...route.stops]
    .sort((a, b) => a.order - b.order)
    .map((s) => `${parseFloat(s.lat)},${parseFloat(s.lng)}`);
  const destination = points[points.length - 1];
  const waypoints = points.slice(0, -1);
  const params = new URLSearchParams({
    api: "1",
    destination,
    travelmode: "driving",
  });
  if (waypoints.length > 0) params.set("waypoints", waypoints.join("|"));
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export default function RouteDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [route, setRoute] = useState<GuestRoute | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api
      .fetchRoute(id)
      .then(({ data }) => setRoute(data))
      .catch((err) => setError(err instanceof Error ? err.message : "Ruta no encontrada."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <View style={styles.center}>
        <View style={[styles.backFloating, { top: insets.top + spacing.sm }]}>
          <BackButton variant="solid" />
        </View>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (error || !route) {
    return (
      <View style={styles.center}>
        <View style={[styles.backFloating, { top: insets.top + spacing.sm }]}>
          <BackButton variant="solid" />
        </View>
        <Text style={styles.notFoundText}>{error ?? "Ruta no encontrada."}</Text>
      </View>
    );
  }

  const diff = DIFFICULTY_COLORS[route.difficulty];
  const hours = Math.floor(route.durationMin / 60);
  const minutes = route.durationMin % 60;
  const mapsUrl = buildGoogleMapsUrl(route);

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="light" />
      <View style={[styles.backFloating, { top: insets.top + spacing.sm }]}>
        <BackButton />
      </View>
      <ScrollView style={{ backgroundColor: colors.background }}>
        <View style={styles.hero}>
          {route.imageUrl ? (
            <>
              <Image source={{ uri: route.imageUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
              <LinearGradient
                colors={["rgba(0,0,0,0.35)", "rgba(0,0,0,0)"]}
                style={styles.heroGradient}
              />
            </>
          ) : (
            <Ionicons name={getRouteIcon(route.icon)} size={48} color="#FFFFFF" />
          )}
        </View>

        <View style={styles.content}>
          <View style={styles.badgeRow}>
            <View style={[styles.pill, { backgroundColor: diff.bg }]}>
              <Text style={[styles.pillText, { color: diff.fg }]}>
                {DIFFICULTY_LABELS[route.difficulty]}
              </Text>
            </View>
            <View style={styles.pill}>
              <Text style={styles.pillTextMuted}>
                {route.isCaminoStage ? "🐚 " : ""}
                {route.category}
              </Text>
            </View>
          </View>

          <Text style={styles.title}>{route.name}</Text>

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Ionicons name="location-outline" size={18} color={colors.text} />
              <Text style={styles.statValue}>{route.distanceKm} km</Text>
              <Text style={styles.statLabel}>Distancia</Text>
            </View>
            <View style={styles.stat}>
              <Ionicons name="time-outline" size={18} color={colors.text} />
              <Text style={styles.statValue}>
                {hours}h {minutes ? `${minutes}min` : ""}
              </Text>
              <Text style={styles.statLabel}>Duración</Text>
            </View>
            <View style={styles.stat}>
              <Ionicons name="trending-up-outline" size={18} color={colors.text} />
              <Text style={styles.statValue}>
                +{route.elevationGainM}m / -{route.elevationLossM}m
              </Text>
              <Text style={styles.statLabel}>Desnivel</Text>
            </View>
          </View>

          {mapsUrl && (
            <Pressable
              style={styles.mapsButton}
              onPress={() => Linking.openURL(mapsUrl)}
            >
              <Ionicons name="navigate-outline" size={18} color="#FFFFFF" />
              <Text style={styles.mapsButtonText}>Cómo llegar (Google Maps)</Text>
            </Pressable>
          )}

          <Text style={styles.sectionTitle}>Descripción</Text>
          <Text style={styles.description}>{route.description}</Text>

          {route.pointsOfInterest.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Puntos de interés</Text>
              <View style={{ gap: spacing.sm }}>
                {route.pointsOfInterest.map((point, i) => (
                  <View key={point} style={styles.poiRow}>
                    <View style={styles.poiIndex}>
                      <Text style={styles.poiIndexText}>{i + 1}</Text>
                    </View>
                    <Text style={styles.poiText}>{point}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
  notFoundText: { fontFamily: fonts.sansMedium, color: colors.textMuted },
  backFloating: { position: "absolute", left: spacing.lg, zIndex: 10 },
  hero: {
    height: 180,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  heroGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  content: { padding: spacing.lg },
  badgeRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.sm },
  pill: {
    borderRadius: radii.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: colors.surfaceMuted,
  },
  pillText: { fontFamily: fonts.sansSemiBold, fontSize: 12 },
  pillTextMuted: { fontFamily: fonts.sansSemiBold, fontSize: 12, color: colors.textMuted },
  title: { fontFamily: fonts.serifBold, fontSize: 26, lineHeight: 31, color: colors.text },
  statsRow: {
    flexDirection: "row",
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    overflow: "hidden",
  },
  stat: { flex: 1, alignItems: "center", paddingVertical: spacing.md, gap: 4 },
  statValue: { fontFamily: fonts.sansSemiBold, fontSize: 13, color: colors.text },
  statLabel: { fontFamily: fonts.sansRegular, fontSize: 11, color: colors.textMuted },
  sectionTitle: {
    fontFamily: fonts.serifSemiBold,
    fontSize: 18,
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  description: { fontFamily: fonts.sansRegular, fontSize: 15, lineHeight: 22, color: colors.textMuted },
  mapsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    marginTop: spacing.lg,
  },
  mapsButtonText: { fontFamily: fonts.sansSemiBold, fontSize: 14, color: "#FFFFFF" },
  poiRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  poiIndex: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  poiIndexText: { fontFamily: fonts.sansSemiBold, fontSize: 12, color: "#FFFFFF" },
  poiText: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.text },
});
