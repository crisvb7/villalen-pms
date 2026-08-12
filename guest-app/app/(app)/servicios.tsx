// app/(app)/servicios.tsx
// Gestión real de las peticiones diarias (desayuno / cena / limpieza). El
// servidor es quien manda sobre los plazos (ver lib/services/guest-service-request.service.ts
// en el backend) — SERVICE_CUTOFFS aquí solo pinta el estado esperado al
// instante, sin esperar a la respuesta del POST.

import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card } from "@/components/Card";
import { DaySelector } from "@/components/DaySelector";
import * as api from "@/lib/api";
import { isSameDay, parseISO, stayNights, toISODate } from "@/lib/date";
import { useAuth } from "@/lib/auth-context";
import { colors, fonts, radii, spacing } from "@/lib/theme";
import { SERVICE_META, SERVICE_ORDER } from "@/lib/service-meta";
import { SERVICE_CUTOFFS, isServiceRequestable } from "@/lib/service-cutoffs";
import type { GuestServiceRequest, GuestServiceType } from "@/lib/types";

export default function ServiciosScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { booking } = useAuth();
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [requests, setRequests] = useState<GuestServiceRequest[]>([]);
  const [dinnerServiceEnabled, setDinnerServiceEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submittingType, setSubmittingType] = useState<GuestServiceType | null>(null);
  const [rowError, setRowError] = useState<{ type: GuestServiceType; message: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const { data, dinnerServiceEnabled } = await api.fetchServiceRequests();
      setRequests(data);
      setDinnerServiceEnabled(dinnerServiceEnabled);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!booking) return null;

  const days = stayNights(booking.checkInDate, booking.checkOutDate);
  const today = selectedDay ?? days.find((d) => isSameDay(d, new Date())) ?? days[0];
  const todayISO = toISODate(today);

  async function handleRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function handleToggle(type: GuestServiceType, requested: boolean) {
    setSubmittingType(type);
    setRowError(null);
    try {
      const { data } = await api.setServiceRequest(todayISO, type, requested);
      setRequests((prev) => {
        const withoutThis = prev.filter((r) => r.id !== data.id);
        return [...withoutThis, data];
      });
    } catch (err) {
      setRowError({
        type,
        message: err instanceof Error ? err.message : "No se pudo actualizar.",
      });
    } finally {
      setSubmittingType(null);
    }
  }

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + spacing.lg,
          paddingBottom: insets.bottom + spacing.xl,
          paddingHorizontal: spacing.lg,
        }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        <Text style={styles.title}>Servicios</Text>
        <Text style={styles.subtitle}>Gestiona tus peticiones diarias</Text>

        <View style={{ marginTop: spacing.lg, marginBottom: spacing.lg }}>
          <DaySelector days={days} selected={today} onSelect={setSelectedDay} />
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
        ) : (
          <View style={{ gap: spacing.md }}>
            {SERVICE_ORDER.map((type) => {
              const meta = SERVICE_META[type];
              const cutoff = SERVICE_CUTOFFS[type];
              const match = requests.find(
                (r) => r.type === type && isSameDay(parseISO(r.date), today)
              );
              const requested = match?.status === "REQUESTED";
              const dinnerDisabled = type === "DINNER" && !dinnerServiceEnabled;
              const canRequest = !dinnerDisabled && isServiceRequestable(type, today);
              const submitting = submittingType === type;

              return (
                <Card key={type}>
                  <View style={styles.row}>
                    <View style={styles.iconBubble}>
                      <Ionicons name={meta.icon} size={20} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.serviceLabel}>{meta.label}</Text>
                      <Text style={styles.serviceDescription}>{meta.description}</Text>
                      <Text style={[styles.cutoff, !canRequest && !requested && styles.cutoffClosed]}>
                        {dinnerDisabled && !requested
                          ? "No disponible fuera de temporada de peregrinos."
                          : canRequest || requested
                            ? cutoff.label
                            : "Plazo cerrado para este día"}
                      </Text>
                    </View>
                    {submitting ? (
                      <ActivityIndicator color={colors.primary} />
                    ) : (
                      <Switch
                        value={requested}
                        onValueChange={(value) => handleToggle(type, value)}
                        disabled={!requested && !canRequest}
                        trackColor={{ false: colors.border, true: colors.successSoft }}
                        thumbColor="#FFFFFF"
                      />
                    )}
                  </View>

                  {requested && (
                    <View style={styles.confirmedRow}>
                      <View style={styles.confirmedBadge}>
                        <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                        <Text style={styles.confirmedText}>Confirmado</Text>
                      </View>
                      <Pressable onPress={() => handleToggle(type, false)} hitSlop={8}>
                        <Text style={styles.undo}>Deshacer</Text>
                      </Pressable>
                    </View>
                  )}

                  {rowError?.type === type && (
                    <Text style={styles.errorText}>{rowError.message}</Text>
                  )}
                </Card>
              );
            })}

            <Pressable style={styles.helpCard} onPress={() => router.push("/recepcion")}>
              <Ionicons name="chatbubbles-outline" size={18} color={colors.accent} />
              <View style={{ flex: 1 }}>
                <Text style={styles.helpTitle}>¿Necesitas algo más?</Text>
                <Text style={styles.helpSubtitle}>
                  Para cualquier petición especial —alergias, cuna, transporte— escríbenos
                  directamente en Recepción.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  title: { fontFamily: fonts.serifBold, fontSize: 28, color: colors.text },
  subtitle: { fontFamily: fonts.sansRegular, fontSize: 14, color: colors.textMuted, marginTop: 2 },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  iconBubble: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: colors.primarySurface,
    alignItems: "center",
    justifyContent: "center",
  },
  serviceLabel: { fontFamily: fonts.sansSemiBold, fontSize: 15, color: colors.text },
  serviceDescription: {
    fontFamily: fonts.sansRegular,
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
    lineHeight: 18,
  },
  cutoff: { fontFamily: fonts.sansMedium, fontSize: 12, color: colors.accent, marginTop: 6 },
  cutoffClosed: { color: colors.textMuted },
  confirmedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  confirmedBadge: { flexDirection: "row", alignItems: "center", gap: 6 },
  confirmedText: { fontFamily: fonts.sansSemiBold, fontSize: 13, color: colors.success },
  undo: { fontFamily: fonts.sansSemiBold, fontSize: 13, color: colors.textMuted },
  errorText: { fontFamily: fonts.sansMedium, fontSize: 12, color: colors.danger, marginTop: spacing.sm },
  helpCard: {
    flexDirection: "row",
    gap: spacing.sm,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  helpTitle: { fontFamily: fonts.sansSemiBold, fontSize: 14, color: colors.text },
  helpSubtitle: { fontFamily: fonts.sansRegular, fontSize: 12, color: colors.textMuted, marginTop: 2, lineHeight: 17 },
});
