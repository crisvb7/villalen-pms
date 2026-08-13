// components/RouteCard.tsx
// Tarjeta grande de ruta — foto (o icono + color de respaldo) a pantalla
// completa con degradado y datos encima. Todas las rutas se muestran así
// dentro de una categoría (ver rutas/categoria/[category].tsx); antes solo
// la etapa de Camino destacada tenía este tratamiento y el resto salían en
// filas pequeñas — se unificó a petición del usuario.

import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { formatDurationMin } from "@/lib/date";
import { DIFFICULTY_LABELS, getRouteIcon } from "@/lib/route-display";
import { colors, fonts, radii, spacing } from "@/lib/theme";
import type { GuestRoute } from "@/lib/types";

export function RouteCard({ route }: { route: GuestRoute }) {
  return (
    <Link href={`/rutas/${route.id}`} asChild>
      <Pressable style={styles.card}>
        {route.imageUrl ? (
          <>
            <Image source={{ uri: route.imageUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
            <View style={[StyleSheet.absoluteFill, styles.scrim]} />
          </>
        ) : (
          <View style={styles.iconWrap}>
            <Ionicons name={getRouteIcon(route.icon)} size={32} color="#FFFFFF" />
          </View>
        )}
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {route.isCaminoStage ? "🐚 " : ""}
            {route.category}
          </Text>
        </View>
        <Text style={styles.name}>{route.name}</Text>
        <Text style={styles.meta}>
          {route.distanceKm} km · {formatDurationMin(route.durationMin)} ·{" "}
          {DIFFICULTY_LABELS[route.difficulty]}
          {route.distanceFromHotelKm ? ` · a ${route.distanceFromHotelKm} km del hotel` : ""}
        </Text>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.lg,
    backgroundColor: colors.primary,
    padding: spacing.lg,
    overflow: "hidden",
    minHeight: 160,
    justifyContent: "flex-end",
  },
  scrim: {
    backgroundColor: "rgba(28,25,23,0.4)",
  },
  iconWrap: {
    position: "absolute",
    top: spacing.lg,
    left: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: radii.md,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: colors.accent,
    borderRadius: radii.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: spacing.sm,
  },
  badgeText: { fontFamily: fonts.sansSemiBold, fontSize: 11, color: "#FFFFFF" },
  name: { fontFamily: fonts.serifBold, fontSize: 22, color: "#FFFFFF", lineHeight: 27 },
  meta: { fontFamily: fonts.sansMedium, fontSize: 13, color: "rgba(255,255,255,0.85)", marginTop: 6 },
});
