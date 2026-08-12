// app/(app)/index.tsx
// Panel de bienvenida: saludo personalizado, selector de días de estancia y
// resumen de servicios del día seleccionado (gestionarlos de verdad pasa por
// la pestaña "Servicios" — aquí es solo un vistazo rápido).

import { useCallback, useEffect, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card } from "@/components/Card";
import { DaySelector } from "@/components/DaySelector";
import * as api from "@/lib/api";
import { formatLongDate, isSameDay, parseISO, toISODate, stayNights } from "@/lib/date";
import { useAuth } from "@/lib/auth-context";
import { colors, fonts, radii, spacing } from "@/lib/theme";
import { SERVICE_META, SERVICE_ORDER } from "@/lib/service-meta";
import type { GuestServiceRequest } from "@/lib/types";

const NEARBY = [
  { icon: "restaurant-outline" as const, name: "La Barra de Ribadesella", meta: "Restaurante · 4 km" },
  { icon: "sunny-outline" as const, name: "Playa de Vega", meta: "Playa · 8 km" },
  { icon: "trail-sign-outline" as const, name: "Cueva de Tito Bustillo", meta: "Patrimonio UNESCO · 5 km" },
];

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 13) return "Buenos días";
  if (hour < 20) return "Buenas tardes";
  return "Buenas noches";
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { booking } = useAuth();
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [requests, setRequests] = useState<GuestServiceRequest[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.fetchServiceRequests();
      setRequests(data);
    } catch {
      // el resumen de Inicio es best-effort; la pestaña Servicios sí exige éxito
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!booking) return null;

  const days = stayNights(booking.checkInDate, booking.checkOutDate);
  const today = selectedDay ?? days.find((d) => isSameDay(d, new Date())) ?? days[0];

  async function handleRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const dayRequests = requests.filter((r) => isSameDay(parseISO(r.date), today));
  const firstName = booking.guestDisplayName?.split(" ")[0] ?? "";

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        <View style={styles.hero}>
          <Image
            source={require("@/assets/images/room-double.jpg")}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
          />
          <LinearGradient
            colors={["rgba(15,25,22,0.15)", "rgba(15,25,22,0.75)"]}
            style={StyleSheet.absoluteFill}
          />
          <View style={[styles.heroContent, { paddingTop: insets.top + spacing.md }]}>
            <Text style={styles.greeting}>
              {greeting()}
              {firstName ? `, ${firstName}` : ""}
            </Text>
            <Text style={styles.roomName}>{booking.roomName}</Text>
            <View style={styles.heroMetaRow}>
              <View style={styles.heroBadge}>
                <Ionicons name="calendar-outline" size={13} color="#FFFFFF" />
                <Text style={styles.heroBadgeText}>
                  {formatLongDate(booking.checkInDate)} → {formatLongDate(booking.checkOutDate)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Días de estancia</Text>
          <DaySelector days={days} selected={today} onSelect={setSelectedDay} />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionLabel}>Servicios · {formatLongDate(toISODate(today))}</Text>
            <Pressable onPress={() => router.push("/servicios")} hitSlop={8}>
              <Text style={styles.link}>Ver todos →</Text>
            </Pressable>
          </View>

          <View style={styles.serviceGrid}>
            {SERVICE_ORDER.map((type) => {
              const meta = SERVICE_META[type];
              const match = dayRequests.find((r) => r.type === type);
              const requested = match?.status === "REQUESTED";
              return (
                <Pressable
                  key={type}
                  onPress={() => router.push("/servicios")}
                  style={[styles.serviceTile, requested && styles.serviceTileActive]}
                >
                  <Ionicons
                    name={meta.icon}
                    size={22}
                    color={requested ? "#FFFFFF" : colors.text}
                  />
                  <Text style={[styles.serviceTileLabel, requested && styles.textOnDark]}>
                    {meta.label}
                  </Text>
                  {requested && (
                    <View style={styles.checkBadge}>
                      <Ionicons name="checkmark" size={12} color={colors.accent} />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Pressable onPress={() => router.push("/recepcion")}>
            <Card style={styles.contactCard}>
              <View style={styles.contactIcon}>
                <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.contactTitle}>¿Necesitas algo?</Text>
                <Text style={styles.contactSubtitle}>Escribe directamente a recepción</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Card>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Cerca de Villalén</Text>
          <View style={{ gap: spacing.sm }}>
            {NEARBY.map((place) => (
              <Card key={place.name} style={styles.nearbyRow}>
                <View style={styles.nearbyIcon}>
                  <Ionicons name={place.icon} size={18} color={colors.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.nearbyName}>{place.name}</Text>
                  <Text style={styles.nearbyMeta}>{place.meta}</Text>
                </View>
              </Card>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  hero: { height: 260, justifyContent: "flex-end" },
  heroContent: { padding: spacing.lg, paddingBottom: spacing.lg },
  greeting: { fontFamily: fonts.sansMedium, fontSize: 14, color: "rgba(255,255,255,0.85)" },
  roomName: { fontFamily: fonts.serifBold, fontSize: 30, color: "#FFFFFF", marginTop: 2 },
  heroMetaRow: { flexDirection: "row", marginTop: spacing.sm },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: radii.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  heroBadgeText: { fontFamily: fonts.sansMedium, fontSize: 12, color: "#FFFFFF" },
  section: { paddingHorizontal: spacing.lg, marginTop: spacing.lg },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  sectionLabel: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  link: { fontFamily: fonts.sansSemiBold, fontSize: 13, color: colors.accent },
  serviceGrid: { flexDirection: "row", gap: spacing.sm },
  serviceTile: {
    flex: 1,
    minHeight: 92,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.sm,
    justifyContent: "space-between",
  },
  serviceTileActive: { backgroundColor: colors.success, borderColor: colors.success },
  serviceTileLabel: { fontFamily: fonts.sansSemiBold, fontSize: 12, color: colors.text, lineHeight: 16 },
  textOnDark: { color: "#FFFFFF" },
  checkBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  contactCard: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  contactIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: colors.primarySurface,
    alignItems: "center",
    justifyContent: "center",
  },
  contactTitle: { fontFamily: fonts.sansSemiBold, fontSize: 15, color: colors.text },
  contactSubtitle: { fontFamily: fonts.sansRegular, fontSize: 13, color: colors.textMuted, marginTop: 2 },
  nearbyRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  nearbyIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    backgroundColor: colors.accentSurface,
    alignItems: "center",
    justifyContent: "center",
  },
  nearbyName: { fontFamily: fonts.sansSemiBold, fontSize: 14, color: colors.text },
  nearbyMeta: { fontFamily: fonts.sansRegular, fontSize: 12, color: colors.textMuted, marginTop: 1 },
});
