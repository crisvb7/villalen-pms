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
  TextInput,
  View,
} from "react-native";
import * as api from "@/lib/api";
import { ScreenHeader } from "@/components/ScreenHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { formatLongDate, formatMoney } from "@/lib/date";
import { colors } from "@/lib/theme";
import type {
  Booking,
  BookingStatus,
  GuestMessageItem,
  GuestServiceRequestItem,
  GuestServiceType,
} from "@/lib/types";

const NEXT_STATUS: Partial<Record<BookingStatus, { label: string; next: BookingStatus }>> = {
  PENDING: { label: "Confirmar", next: "CONFIRMED" },
  CONFIRMED: { label: "Marcar entrada", next: "CHECKED_IN" },
  CHECKED_IN: { label: "Marcar salida", next: "CHECKED_OUT" },
};

const SERVICE_META: { type: GuestServiceType; label: string; icon: string }[] = [
  { type: "BREAKFAST", label: "Desayuno", icon: "🍳" },
  { type: "DINNER", label: "Cena", icon: "🍽️" },
  { type: "CLEANING", label: "Limpieza", icon: "🧹" },
];

function stayNights(checkInDate: string, checkOutDate: string): string[] {
  const nights: string[] = [];
  const cursor = new Date(checkInDate);
  const end = new Date(checkOutDate);
  while (cursor < end) {
    nights.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return nights;
}

export default function BookingDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guestAccessBusy, setGuestAccessBusy] = useState(false);
  const [services, setServices] = useState<GuestServiceRequestItem[]>([]);
  const [togglingService, setTogglingService] = useState<string | null>(null);
  const [messages, setMessages] = useState<GuestMessageItem[]>([]);
  const [messageBody, setMessageBody] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [clearingChat, setClearingChat] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [bookingRes, servicesRes, messagesRes] = await Promise.all([
        api.fetchBooking(id),
        api.fetchBookingServices(id),
        api.fetchBookingMessages(id),
      ]);
      setBooking(bookingRes.data);
      setServices(servicesRes.data);
      setMessages(messagesRes.data);
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

  async function toggleService(dateStr: string, type: GuestServiceType, next: boolean) {
    if (!booking) return;
    const key = `${dateStr}-${type}`;
    setTogglingService(key);
    try {
      const res = await api.setBookingService(booking.id, dateStr, type, next);
      setServices((prev) => {
        const idx = prev.findIndex((r) => r.date.slice(0, 10) === dateStr && r.type === type);
        if (idx === -1) return [...prev, res.data];
        const copy = [...prev];
        copy[idx] = res.data;
        return copy;
      });
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "No se pudo actualizar.");
    } finally {
      setTogglingService(null);
    }
  }

  async function sendMessage() {
    const body = messageBody.trim();
    if (!booking || !body) return;
    setSendingMessage(true);
    try {
      const res = await api.sendBookingMessage(booking.id, body);
      setMessages((prev) => [...prev, res.data]);
      setMessageBody("");
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "No se pudo enviar el mensaje.");
    } finally {
      setSendingMessage(false);
    }
  }

  function confirmClearGuestChat() {
    Alert.alert(
      "Ocultar chat al huésped",
      "El huésped dejará de ver el chat en su app (si vuelve a escribir, lo nuevo sí se verá). El historial completo sigue disponible aquí. ¿Continuar?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Sí, ocultar",
          onPress: async () => {
            if (!booking) return;
            setClearingChat(true);
            try {
              const res = await api.clearGuestChat(booking.id);
              setBooking(res.data);
            } catch (err) {
              Alert.alert("Error", err instanceof Error ? err.message : "No se pudo ocultar el chat.");
            } finally {
              setClearingChat(false);
            }
          },
        },
      ]
    );
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
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 12, paddingLeft: 16 + insets.left, paddingRight: 16 + insets.right },
      ]}
    >
      <ScreenHeader
        eyebrow="Reserva"
        title={`${booking.guest.firstName} ${booking.guest.lastName}`}
        right={<StatusBadge status={booking.status} />}
        showBack
      />

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

      {booking.status !== "CANCELLED" ? (
        <Section title="Servicios diarios">
          {stayNights(booking.checkInDate, booking.checkOutDate).map((dateStr) => (
            <View key={dateStr} style={styles.serviceDayRow}>
              <Text style={styles.serviceDayLabel}>{formatLongDate(dateStr)}</Text>
              <View style={styles.serviceChips}>
                {SERVICE_META.map((meta) => {
                  const active = services.some(
                    (r) => r.date.slice(0, 10) === dateStr && r.type === meta.type && r.status === "REQUESTED"
                  );
                  const key = `${dateStr}-${meta.type}`;
                  return (
                    <Pressable
                      key={meta.type}
                      disabled={togglingService === key}
                      onPress={() => toggleService(dateStr, meta.type, !active)}
                      style={[
                        styles.serviceChip,
                        active ? styles.serviceChipActive : styles.serviceChipInactive,
                        togglingService === key && styles.buttonDisabled,
                      ]}
                    >
                      <Text style={active ? styles.serviceChipTextActive : styles.serviceChipText}>
                        {meta.icon} {meta.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
        </Section>
      ) : null}

      {booking.status !== "CANCELLED" ? (
        <Section title="Chat con el huésped">
          <View style={styles.guestAccessActions}>
            <Pressable
              style={[styles.button, styles.buttonSecondary, clearingChat && styles.buttonDisabled]}
              disabled={clearingChat}
              onPress={confirmClearGuestChat}
            >
              <Text style={styles.buttonSecondaryText}>
                {clearingChat ? "Ocultando…" : "Ocultar chat al huésped"}
              </Text>
            </Pressable>
          </View>
          {booking.guestChatClearedAt ? (
            <Text style={styles.notes}>
              Oculto al huésped desde el {new Date(booking.guestChatClearedAt).toLocaleString("es-ES")}
              {" "}— este historial completo solo lo ves tú.
            </Text>
          ) : null}
          {messages.length === 0 ? (
            <Text style={styles.notes}>Todavía no hay mensajes.</Text>
          ) : (
            messages.map((m) => (
              <View
                key={m.id}
                style={[
                  styles.messageBubble,
                  m.sender === "STAFF" ? styles.messageBubbleStaff : styles.messageBubbleGuest,
                ]}
              >
                <Text style={m.sender === "STAFF" ? styles.messageTextStaff : styles.messageText}>
                  {m.body}
                </Text>
              </View>
            ))
          )}
          <View style={styles.messageComposer}>
            <TextInput
              value={messageBody}
              onChangeText={setMessageBody}
              placeholder="Escribe una respuesta…"
              placeholderTextColor={colors.textMuted}
              style={styles.messageInput}
              multiline
            />
            <Pressable
              disabled={sendingMessage || !messageBody.trim()}
              onPress={sendMessage}
              style={[styles.button, (sendingMessage || !messageBody.trim()) && styles.buttonDisabled]}
            >
              <Text style={styles.buttonText}>Enviar</Text>
            </Pressable>
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
  serviceDayRow: {
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  serviceDayLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
    textTransform: "capitalize",
  },
  serviceChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  serviceChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  serviceChipActive: {
    backgroundColor: "#D1FAE5",
    borderColor: "#A7F3D0",
  },
  serviceChipInactive: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  serviceChipText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
  },
  serviceChipTextActive: {
    color: "#065F46",
    fontSize: 12,
    fontWeight: "700",
  },
  messageBubble: {
    maxWidth: "80%",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 8,
  },
  messageBubbleGuest: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignSelf: "flex-start",
  },
  messageBubbleStaff: {
    backgroundColor: colors.primary,
    alignSelf: "flex-end",
  },
  messageText: {
    color: colors.text,
    fontSize: 14,
  },
  messageTextStaff: {
    color: colors.primaryText,
    fontSize: 14,
  },
  messageComposer: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
    alignItems: "flex-end",
  },
  messageInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: colors.text,
    fontSize: 14,
    maxHeight: 100,
  },
});
