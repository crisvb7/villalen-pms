import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCallback, useState, type ReactNode } from "react";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as api from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";
import { formatLongDate, formatMoney } from "@/lib/date";
import { colors, fonts } from "@/lib/theme";
import type { Booking, BookingStatus } from "@/lib/types";

const NEXT_STATUS: Partial<Record<BookingStatus, { label: string; next: BookingStatus }>> = {
  PENDING: { label: "Confirmar", next: "CONFIRMED" },
  CONFIRMED: { label: "Marcar entrada", next: "CHECKED_IN" },
  CHECKED_IN: { label: "Marcar salida", next: "CHECKED_OUT" },
};

export default function BookingDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guestAccessBusy, setGuestAccessBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api.fetchBooking(id);
      setBooking(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar la reserva.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function changeStatus(status: BookingStatus) {
    if (!booking) return;
    setUpdating(true);
    try {
      const res = await api.updateBookingStatus(booking.id, status);
      setBooking(res.data);
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "No se pudo actualizar.");
    } finally {
      setUpdating(false);
    }
  }

  function confirmCancel() {
    Alert.alert("Cancelar reserva", "¿Seguro que quieres cancelar esta reserva?", [
      { text: "No", style: "cancel" },
      { text: "Sí, cancelar", style: "destructive", onPress: () => changeStatus("CANCELLED") },
    ]);
  }

  async function generateGuestAccess() {
    if (!booking) return;
    setGuestAccessBusy(true);
    try {
      const res = await api.generateGuestAccess(booking.id);
      await load();
      Alert.alert(
        "Código de acceso generado",
        `${res.data.code}\n\nApúntalo o dilo al huésped ahora: no podrás volver a verlo. ` +
          "Cualquier código anterior de esta reserva ha quedado invalidado."
      );
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "No se pudo generar el código.");
    } finally {
      setGuestAccessBusy(false);
    }
  }

  function confirmGenerateGuestAccess() {
    if (!booking) return;
    if (booking.guestAccessCodeSetAt) {
      Alert.alert(
        "Regenerar código",
        "Ya hay un código activo. Generar uno nuevo invalidará el acceso del huésped actual (y le volverá a pedir el nombre). ¿Continuar?",
        [
          { text: "Cancelar", style: "cancel" },
          { text: "Sí, regenerar", onPress: generateGuestAccess },
        ]
      );
      return;
    }
    generateGuestAccess();
  }

  function confirmRevokeGuestAccess() {
    Alert.alert("Revocar acceso", "El huésped no podrá volver a entrar en la app hasta que le generes un código nuevo. ¿Continuar?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sí, revocar",
        style: "destructive",
        onPress: async () => {
          if (!booking) return;
          setGuestAccessBusy(true);
          try {
            await api.revokeGuestAccess(booking.id);
            await load();
          } catch (err) {
            Alert.alert("Error", err instanceof Error ? err.message : "No se pudo revocar el acceso.");
          } finally {
            setGuestAccessBusy(false);
          }
        },
      },
    ]);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !booking) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error ?? "Reserva no encontrada."}</Text>
      </View>
    );
  }

  const nextAction = NEXT_STATUS[booking.status];

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingLeft: 16 + insets.left, paddingRight: 16 + insets.right }]}>
      <View style={styles.headerRow}>
        <Text style={styles.name}>
          {booking.guest.firstName} {booking.guest.lastName}
        </Text>
        <StatusBadge status={booking.status} />
      </View>

      <Section title="Fechas">
        <Row label="Entrada" value={formatLongDate(booking.checkInDate)} />
        <Row label="Salida" value={formatLongDate(booking.checkOutDate)} />
        <Row label="Adultos / Niños" value={`${booking.adults} / ${booking.children}`} />
      </Section>

      <Section title="Habitación">
        <Row label="Nombre" value={booking.room?.name ?? "Sin asignar"} />
        <Row label="Tipo" value={booking.roomType} />
      </Section>

      <Section title="Huésped">
        <Row label="Email" value={booking.guest.email} />
        <Row label="Teléfono" value={booking.guest.phone ?? "—"} />
        <Row label="Documento" value={booking.guest.documentId} />
      </Section>

      <Section title="Pago">
        <Row label="Total" value={formatMoney(booking.totalAmount)} />
        <Row label="Depósito pagado" value={booking.depositPaid ? "Sí" : "No"} />
        <Row label="Origen" value={booking.source} />
      </Section>

      {booking.notes ? (
        <Section title="Notas">
          <Text style={styles.notes}>{booking.notes}</Text>
        </Section>
      ) : null}

      {booking.status !== "CANCELLED" ? (
        <Section title="App de huéspedes">
          <Row
            label="Estado"
            value={
              booking.guestAccessCodeSetAt
                ? booking.guestDisplayName
                  ? `Activo · ${booking.guestDisplayName}`
                  : "Activo · código sin usar"
                : "Sin código"
            }
          />
          {booking.guestAccessCodePlain ? (
            <Text style={styles.pendingCode}>
              🔑 Código de hoy: {booking.guestAccessCodePlain}
            </Text>
          ) : null}
          <View style={styles.guestAccessActions}>
            <Pressable
              style={[styles.button, styles.buttonSecondary, guestAccessBusy && styles.buttonDisabled]}
              disabled={guestAccessBusy}
              onPress={confirmGenerateGuestAccess}
            >
              <Text style={styles.buttonSecondaryText}>
                {booking.guestAccessCodeSetAt ? "Regenerar código" : "Generar código"}
              </Text>
            </Pressable>
            {booking.guestAccessCodeSetAt ? (
              <Pressable
                style={[styles.button, styles.buttonDanger, guestAccessBusy && styles.buttonDisabled]}
                disabled={guestAccessBusy}
                onPress={confirmRevokeGuestAccess}
              >
                <Text style={styles.buttonText}>Revocar acceso</Text>
              </Pressable>
            ) : null}
          </View>
        </Section>
      ) : null}

      <View style={styles.actions}>
        {nextAction ? (
          <Pressable
            style={[styles.button, updating && styles.buttonDisabled]}
            disabled={updating}
            onPress={() => changeStatus(nextAction.next)}
          >
            <Text style={styles.buttonText}>{nextAction.label}</Text>
          </Pressable>
        ) : null}

        {booking.status !== "CANCELLED" && booking.status !== "CHECKED_OUT" ? (
          <Pressable
            style={[styles.button, styles.buttonDanger, updating && styles.buttonDisabled]}
            disabled={updating}
            onPress={confirmCancel}
          >
            <Text style={styles.buttonText}>Cancelar reserva</Text>
          </Pressable>
        ) : null}
      </View>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
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
  error: {
    color: colors.danger,
    fontSize: 15,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  name: {
    fontFamily: fonts.serifBold,
    fontSize: 22,
    color: colors.text,
    flexShrink: 1,
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  rowLabel: {
    color: colors.textMuted,
    fontSize: 14,
  },
  rowValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "500",
  },
  notes: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    marginTop: 8,
    gap: 10,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonDanger: {
    backgroundColor: colors.danger,
  },
  buttonSecondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: colors.primaryText,
    fontWeight: "600",
    fontSize: 15,
  },
  buttonSecondaryText: {
    color: colors.text,
    fontWeight: "600",
    fontSize: 15,
  },
  guestAccessActions: {
    marginTop: 10,
    gap: 10,
  },
  pendingCode: {
    marginTop: 8,
    alignSelf: "flex-start",
    backgroundColor: "#FEF3C7",
    color: "#92400E",
    fontWeight: "700",
    fontSize: 13,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
});
