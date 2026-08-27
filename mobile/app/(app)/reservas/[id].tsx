import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import * as api from "@/lib/api";
import type { AddTravelerInput, UpdateGuestInput } from "@/lib/api";
import { Badge } from "@/components/Badge";
import { ModalSheet } from "@/components/ModalSheet";
import { ScreenHeader } from "@/components/ScreenHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { TextField } from "@/components/TextField";
import { API_URL } from "@/lib/config";
import { formatLongDate, formatMoney, formatShortDate } from "@/lib/date";
import { detectDocumentType, isMinorDob, SEX_LABELS } from "@/lib/guest";
import { colors } from "@/lib/theme";
import type {
  Booking,
  BookingStatus,
  BookingTraveler,
  GuestMessageItem,
  GuestServiceRequestItem,
  GuestServiceType,
  GuestSex,
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
  const [travelers, setTravelers] = useState<BookingTraveler[]>([]);
  const [guestModalVisible, setGuestModalVisible] = useState(false);
  const [travelerModalVisible, setTravelerModalVisible] = useState(false);
  const [sendingSes, setSendingSes] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [bookingRes, servicesRes, messagesRes, travelersRes] = await Promise.all([
        api.fetchBooking(id),
        api.fetchBookingServices(id),
        api.fetchBookingMessages(id),
        api.fetchBookingTravelers(id),
      ]);
      setBooking(bookingRes.data);
      setServices(servicesRes.data);
      setMessages(messagesRes.data);
      setTravelers(travelersRes.data);
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

  async function handleSharePrecheckinLink() {
    if (!booking) return;
    const link = `${API_URL}/precheckin/${booking.id}`;
    try {
      await Share.share({ message: link });
    } catch {
      // el usuario canceló el share sheet, nada que hacer
    }
  }

  function confirmSendSes() {
    if (!booking) return;
    const verb = booking.sesSubmittedAt ? "Reenviar" : "Enviar";
    Alert.alert(
      `${verb} a Policía`,
      "Esto comunica los datos reales del huésped y acompañantes a SES.HOSPEDAJES (Ministerio del Interior). No es reversible. ¿Continuar?",
      [
        { text: "Cancelar", style: "cancel" },
        { text: verb, onPress: sendSes },
      ]
    );
  }

  async function sendSes() {
    if (!booking) return;
    setSendingSes(true);
    try {
      const res = await api.submitBookingToSes(booking.id);
      Alert.alert("Enviado", res.message);
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "No se pudo enviar a Policía.");
    } finally {
      setSendingSes(false);
      await load();
    }
  }

  function confirmRemoveTraveler(traveler: BookingTraveler) {
    Alert.alert(
      "Eliminar acompañante",
      `¿Eliminar a ${traveler.firstName} ${traveler.lastName} de la reserva?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            if (!booking) return;
            setTravelers((prev) => prev.filter((t) => t.id !== traveler.id));
            try {
              await api.removeBookingTraveler(booking.id, traveler.id);
            } catch (err) {
              Alert.alert("Error", err instanceof Error ? err.message : "No se pudo eliminar.");
              await load();
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

      <Section title="Huésped y verificación policial">
        <View style={styles.badgeRow}>
          <Badge
            label={
              booking.precheckinCompletedAt
                ? `✓ Precheckin completado · ${formatShortDate(booking.precheckinCompletedAt)}`
                : "⏳ Precheckin pendiente"
            }
            tone={booking.precheckinCompletedAt ? "green" : "orange"}
          />
          <Pressable
            disabled={!booking.sesSubmissionError}
            onPress={() => Alert.alert("Error al enviar a Policía", booking.sesSubmissionError ?? "")}
          >
            <Badge
              label={
                booking.sesSubmittedAt
                  ? `✓ Enviado a Policía · ${formatShortDate(booking.sesSubmittedAt)}`
                  : booking.sesSubmissionError
                    ? "⚠ Error al enviar a Policía (toca para ver)"
                    : "Sin enviar a Policía"
              }
              tone={booking.sesSubmittedAt ? "green" : booking.sesSubmissionError ? "red" : "gray"}
            />
          </Pressable>
        </View>

        <Row label="Email" value={booking.guest.email} />
        <Row label="Teléfono" value={booking.guest.phone ?? "—"} />
        <Row
          label="Nombre completo"
          value={`${booking.guest.firstName} ${booking.guest.lastName} ${booking.guest.secondLastName ?? ""}`.trim()}
        />
        <Row
          label="Documento"
          value={`${detectDocumentType(booking.guest.documentId)} ${booking.guest.documentId}${
            booking.guest.documentSupportNumber ? ` (soporte ${booking.guest.documentSupportNumber})` : ""
          }`}
        />
        <Row label="Sexo" value={booking.guest.sex ? SEX_LABELS[booking.guest.sex] : "Sin indicar"} />
        <Row label="Nacionalidad" value={booking.guest.nationality ?? "—"} />
        <Row
          label="Fecha de nacimiento"
          value={booking.guest.birthDate ? formatShortDate(booking.guest.birthDate) : "—"}
        />
        <Row
          label="Dirección"
          value={
            [
              booking.guest.addressStreet,
              booking.guest.addressPostalCode,
              booking.guest.addressCity,
              booking.guest.addressProvince,
              booking.guest.addressCountry,
            ]
              .filter(Boolean)
              .join(", ") || "Sin indicar"
          }
        />

        <View style={styles.guestActions}>
          <Pressable
            style={[styles.button, styles.buttonSecondary]}
            onPress={() => setGuestModalVisible(true)}
          >
            <Text style={styles.buttonSecondaryText}>✏️ Editar datos</Text>
          </Pressable>
          {booking.status !== "CANCELLED" && booking.status !== "CHECKED_OUT" ? (
            <Pressable
              style={[styles.button, styles.buttonSecondary]}
              onPress={handleSharePrecheckinLink}
            >
              <Text style={styles.buttonSecondaryText}>🔗 Compartir enlace precheckin</Text>
            </Pressable>
          ) : null}
          {booking.status !== "CANCELLED" ? (
            <Pressable
              style={[styles.button, sendingSes && styles.buttonDisabled]}
              disabled={sendingSes}
              onPress={confirmSendSes}
            >
              <Text style={styles.buttonText}>
                {sendingSes ? "Enviando…" : booking.sesSubmittedAt ? "📤 Reenviar a Policía" : "📤 Enviar a Policía"}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </Section>

      <Section title="Acompañantes">
        {travelers.length === 0 ? (
          <Text style={styles.notes}>Todavía no hay acompañantes añadidos.</Text>
        ) : (
          travelers.map((t) => (
            <View key={t.id} style={styles.travelerRow}>
              <View style={styles.travelerInfo}>
                <Text style={styles.travelerName}>
                  {t.firstName} {t.lastName} {t.secondLastName ?? ""}
                </Text>
                <Text style={styles.notes}>
                  {t.documentId
                    ? `${detectDocumentType(t.documentId)} ${t.documentId}${
                        t.documentSupportNumber ? ` (soporte ${t.documentSupportNumber})` : ""
                      }`
                    : "Sin documento (menor de edad)"}
                </Text>
                <Text style={styles.travelerMeta}>
                  {[
                    t.sex ? SEX_LABELS[t.sex] : null,
                    t.birthDate ? formatShortDate(t.birthDate) : null,
                    t.nationality,
                    t.relationshipToLead ? `Parentesco: ${t.relationshipToLead}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "Sin más datos"}
                </Text>
              </View>
              <Pressable onPress={() => confirmRemoveTraveler(t)} style={styles.travelerDelete}>
                <Text style={styles.travelerDeleteText}>Eliminar</Text>
              </Pressable>
            </View>
          ))
        )}
        <Pressable
          style={[styles.button, styles.buttonSecondary, styles.addTravelerButton]}
          onPress={() => setTravelerModalVisible(true)}
        >
          <Text style={styles.buttonSecondaryText}>+ Añadir acompañante</Text>
        </Pressable>
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

      <GuestEditModal
        visible={guestModalVisible}
        guest={booking.guest}
        bookingId={booking.id}
        onClose={() => setGuestModalVisible(false)}
        onSaved={async () => {
          setGuestModalVisible(false);
          await load();
        }}
      />
      <TravelerAddModal
        visible={travelerModalVisible}
        leadAddress={booking.guest.addressStreet}
        bookingId={booking.id}
        onClose={() => setTravelerModalVisible(false)}
        onAdded={async () => {
          setTravelerModalVisible(false);
          await load();
        }}
      />
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

function SexPicker({
  value,
  onChange,
}: {
  value: GuestSex | "";
  onChange: (v: GuestSex | "") => void;
}) {
  return (
    <View style={styles.sexPickerRow}>
      {(["H", "M"] as GuestSex[]).map((option) => (
        <Pressable
          key={option}
          onPress={() => onChange(value === option ? "" : option)}
          style={[styles.sexChip, value === option && styles.sexChipActive]}
        >
          <Text style={value === option ? styles.sexChipTextActive : styles.sexChipText}>
            {SEX_LABELS[option]}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const EMPTY_GUEST_FORM: UpdateGuestInput = {
  firstName: "",
  lastName: "",
  secondLastName: "",
  documentId: "",
  documentSupportNumber: "",
  nationality: "",
  birthDate: "",
  sex: "",
  phone: "",
  addressStreet: "",
  addressCity: "",
  addressMunicipalityCode: "",
  addressPostalCode: "",
  addressProvince: "",
  addressCountry: "",
};

function guestToForm(guest: Booking["guest"]): UpdateGuestInput {
  return {
    firstName: guest.firstName,
    lastName: guest.lastName,
    secondLastName: guest.secondLastName ?? "",
    documentId: guest.documentId,
    documentSupportNumber: guest.documentSupportNumber ?? "",
    nationality: guest.nationality ?? "",
    birthDate: guest.birthDate ? guest.birthDate.slice(0, 10) : "",
    sex: guest.sex ?? "",
    phone: guest.phone ?? "",
    addressStreet: guest.addressStreet ?? "",
    addressCity: guest.addressCity ?? "",
    addressMunicipalityCode: guest.addressMunicipalityCode ?? "",
    addressPostalCode: guest.addressPostalCode ?? "",
    addressProvince: guest.addressProvince ?? "",
    addressCountry: guest.addressCountry ?? "ES",
  };
}

function GuestEditModal({
  visible,
  guest,
  bookingId,
  onClose,
  onSaved,
}: {
  visible: boolean;
  guest: Booking["guest"];
  bookingId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<UpdateGuestInput>(EMPTY_GUEST_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) setForm(guestToForm(guest));
  }, [visible, guest]);

  const docType = detectDocumentType(form.documentId || "X");
  const needsSupportNumber = docType === "DNI" || docType === "NIE";

  async function submit() {
    if (!form.firstName.trim() || !form.lastName.trim() || !form.documentId.trim()) {
      Alert.alert("Datos incompletos", "Nombre, primer apellido y documento son obligatorios.");
      return;
    }
    setSaving(true);
    try {
      await api.updateGuestPrecheckin(bookingId, form);
      onSaved();
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "No se pudieron guardar los datos.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalSheet visible={visible} title="Datos del huésped" onClose={onClose}>
      <ScrollView keyboardShouldPersistTaps="handled">
        <TextField
          label="Nombre *"
          value={form.firstName}
          onChangeText={(v) => setForm((f) => ({ ...f, firstName: v }))}
        />
        <TextField
          label="Primer apellido *"
          value={form.lastName}
          onChangeText={(v) => setForm((f) => ({ ...f, lastName: v }))}
        />
        <TextField
          label="Segundo apellido"
          value={form.secondLastName}
          onChangeText={(v) => setForm((f) => ({ ...f, secondLastName: v }))}
        />
        <TextField
          label="DNI / NIE / Pasaporte *"
          value={form.documentId}
          autoCapitalize="characters"
          onChangeText={(v) => setForm((f) => ({ ...f, documentId: v.toUpperCase() }))}
        />
        {needsSupportNumber ? (
          <TextField
            label="Nº de soporte *"
            value={form.documentSupportNumber}
            autoCapitalize="characters"
            placeholder="Reverso del documento"
            onChangeText={(v) => setForm((f) => ({ ...f, documentSupportNumber: v.toUpperCase() }))}
          />
        ) : null}

        <Text style={styles.fieldLabel}>Sexo</Text>
        <SexPicker value={form.sex ?? ""} onChange={(v) => setForm((f) => ({ ...f, sex: v }))} />

        <TextField
          label="Nacionalidad"
          value={form.nationality}
          placeholder="ESP"
          autoCapitalize="characters"
          onChangeText={(v) => setForm((f) => ({ ...f, nationality: v.toUpperCase() }))}
        />
        <TextField
          label="Fecha de nacimiento"
          value={form.birthDate}
          placeholder="AAAA-MM-DD"
          onChangeText={(v) => setForm((f) => ({ ...f, birthDate: v }))}
        />
        <TextField
          label="Teléfono"
          value={form.phone}
          keyboardType="phone-pad"
          onChangeText={(v) => setForm((f) => ({ ...f, phone: v }))}
        />

        <Text style={styles.sectionSubtitle}>Dirección de residencia</Text>
        <TextField
          label="Dirección (calle y número) *"
          value={form.addressStreet}
          onChangeText={(v) => setForm((f) => ({ ...f, addressStreet: v }))}
        />
        <TextField
          label="Municipio *"
          value={form.addressCity}
          onChangeText={(v) => setForm((f) => ({ ...f, addressCity: v }))}
        />
        <TextField
          label="Cód. INE municipio *"
          value={form.addressMunicipalityCode}
          placeholder="5 dígitos"
          maxLength={5}
          keyboardType="number-pad"
          onChangeText={(v) => setForm((f) => ({ ...f, addressMunicipalityCode: v }))}
        />
        <TextField
          label="C.P. *"
          value={form.addressPostalCode}
          keyboardType="number-pad"
          onChangeText={(v) => setForm((f) => ({ ...f, addressPostalCode: v }))}
        />
        <TextField
          label="Provincia"
          value={form.addressProvince}
          onChangeText={(v) => setForm((f) => ({ ...f, addressProvince: v }))}
        />
        <TextField
          label="País *"
          value={form.addressCountry}
          placeholder="ES"
          autoCapitalize="characters"
          onChangeText={(v) => setForm((f) => ({ ...f, addressCountry: v.toUpperCase() }))}
        />

        <Pressable
          style={[styles.button, saving && styles.buttonDisabled]}
          disabled={saving}
          onPress={submit}
        >
          <Text style={styles.buttonText}>{saving ? "Guardando…" : "Guardar datos"}</Text>
        </Pressable>
      </ScrollView>
    </ModalSheet>
  );
}

const EMPTY_TRAVELER_FORM: AddTravelerInput & { sameAddressAsLead: boolean } = {
  firstName: "",
  lastName: "",
  secondLastName: "",
  documentId: "",
  documentSupportNumber: "",
  birthDate: "",
  nationality: "",
  sex: "",
  relationshipToLead: "",
  sameAddressAsLead: true,
  addressStreet: "",
  addressCity: "",
  addressMunicipalityCode: "",
  addressPostalCode: "",
  addressProvince: "",
  addressCountry: "",
  phone: "",
  email: "",
};

function TravelerAddModal({
  visible,
  bookingId,
  leadAddress,
  onClose,
  onAdded,
}: {
  visible: boolean;
  bookingId: string;
  leadAddress: string | null;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [form, setForm] = useState(EMPTY_TRAVELER_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) setForm(EMPTY_TRAVELER_FORM);
  }, [visible]);

  const minor = isMinorDob(form.birthDate ?? "");
  const docType = detectDocumentType(form.documentId || "X");
  const needsSupportNumber = !minor && (docType === "DNI" || docType === "NIE");

  async function submit() {
    if (!form.firstName?.trim() || !form.lastName?.trim()) {
      Alert.alert("Datos incompletos", "Nombre y primer apellido son obligatorios.");
      return;
    }
    if (minor && !form.relationshipToLead?.trim()) {
      Alert.alert("Falta un dato", "Indica el parentesco con el titular para un menor de edad.");
      return;
    }
    if (!minor && !form.documentId?.trim()) {
      Alert.alert("Falta un dato", "El documento es obligatorio para un acompañante mayor de edad.");
      return;
    }
    if (!form.sameAddressAsLead) {
      const country = (form.addressCountry ?? "").toUpperCase();
      const isSpain = country === "ES" || country === "ESP";
      if (
        !form.addressStreet?.trim() ||
        !form.addressCity?.trim() ||
        !form.addressPostalCode?.trim() ||
        !form.addressCountry?.trim() ||
        (isSpain && !form.addressMunicipalityCode?.trim())
      ) {
        Alert.alert(
          "Falta la dirección",
          "Completa la dirección del acompañante (o marca que es la misma que la del titular)."
        );
        return;
      }
    }
    setSaving(true);
    try {
      const { sameAddressAsLead, ...rest } = form;
      const payload: AddTravelerInput = sameAddressAsLead
        ? {
            ...rest,
            addressStreet: undefined,
            addressCity: undefined,
            addressMunicipalityCode: undefined,
            addressPostalCode: undefined,
            addressProvince: undefined,
            addressCountry: undefined,
            phone: undefined,
            email: undefined,
          }
        : rest;
      await api.addBookingTraveler(bookingId, payload);
      onAdded();
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "No se pudo añadir el acompañante.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalSheet visible={visible} title="Añadir acompañante" onClose={onClose}>
      <ScrollView keyboardShouldPersistTaps="handled">
        <TextField
          label="Nombre *"
          value={form.firstName}
          onChangeText={(v) => setForm((f) => ({ ...f, firstName: v }))}
        />
        <TextField
          label="Primer apellido *"
          value={form.lastName}
          onChangeText={(v) => setForm((f) => ({ ...f, lastName: v }))}
        />
        <TextField
          label="Segundo apellido"
          value={form.secondLastName}
          onChangeText={(v) => setForm((f) => ({ ...f, secondLastName: v }))}
        />
        <TextField
          label="Fecha de nacimiento"
          value={form.birthDate}
          placeholder="AAAA-MM-DD"
          onChangeText={(v) => setForm((f) => ({ ...f, birthDate: v }))}
        />

        {minor ? (
          <TextField
            label="Parentesco con el titular *"
            value={form.relationshipToLead}
            placeholder="Ej. hijo/a, nieto/a…"
            onChangeText={(v) => setForm((f) => ({ ...f, relationshipToLead: v }))}
          />
        ) : (
          <>
            <TextField
              label="DNI / NIE / Pasaporte *"
              value={form.documentId}
              autoCapitalize="characters"
              onChangeText={(v) => setForm((f) => ({ ...f, documentId: v.toUpperCase() }))}
            />
            {needsSupportNumber ? (
              <TextField
                label="Nº de soporte *"
                value={form.documentSupportNumber}
                autoCapitalize="characters"
                onChangeText={(v) => setForm((f) => ({ ...f, documentSupportNumber: v.toUpperCase() }))}
              />
            ) : null}
          </>
        )}

        <TextField
          label="Nacionalidad"
          value={form.nationality}
          placeholder="ESP"
          autoCapitalize="characters"
          onChangeText={(v) => setForm((f) => ({ ...f, nationality: v.toUpperCase() }))}
        />

        <Text style={styles.fieldLabel}>Sexo</Text>
        <SexPicker value={form.sex ?? ""} onChange={(v) => setForm((f) => ({ ...f, sex: v }))} />

        <TextField
          label="Teléfono"
          value={form.phone}
          keyboardType="phone-pad"
          placeholder={form.sameAddressAsLead ? "Opcional (usa el del titular)" : ""}
          onChangeText={(v) => setForm((f) => ({ ...f, phone: v }))}
        />

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>
            Vive en la misma dirección que el titular{leadAddress ? ` (${leadAddress})` : ""}
          </Text>
          <Switch
            value={form.sameAddressAsLead}
            onValueChange={(v) => setForm((f) => ({ ...f, sameAddressAsLead: v }))}
            trackColor={{ true: colors.primary }}
          />
        </View>

        {!form.sameAddressAsLead ? (
          <View style={styles.addressBox}>
            <TextField
              label="Dirección (calle y número) *"
              value={form.addressStreet}
              onChangeText={(v) => setForm((f) => ({ ...f, addressStreet: v }))}
            />
            <TextField
              label="Municipio *"
              value={form.addressCity}
              onChangeText={(v) => setForm((f) => ({ ...f, addressCity: v }))}
            />
            <TextField
              label="Cód. INE municipio *"
              value={form.addressMunicipalityCode}
              maxLength={5}
              keyboardType="number-pad"
              onChangeText={(v) => setForm((f) => ({ ...f, addressMunicipalityCode: v }))}
            />
            <TextField
              label="C.P. *"
              value={form.addressPostalCode}
              keyboardType="number-pad"
              onChangeText={(v) => setForm((f) => ({ ...f, addressPostalCode: v }))}
            />
            <TextField
              label="Provincia"
              value={form.addressProvince}
              onChangeText={(v) => setForm((f) => ({ ...f, addressProvince: v }))}
            />
            <TextField
              label="País *"
              value={form.addressCountry}
              placeholder="ES"
              autoCapitalize="characters"
              onChangeText={(v) => setForm((f) => ({ ...f, addressCountry: v.toUpperCase() }))}
            />
            <TextField
              label="Email"
              value={form.email}
              keyboardType="email-address"
              autoCapitalize="none"
              onChangeText={(v) => setForm((f) => ({ ...f, email: v }))}
            />
          </View>
        ) : null}

        <Pressable
          style={[styles.button, saving && styles.buttonDisabled]}
          disabled={saving}
          onPress={submit}
        >
          <Text style={styles.buttonText}>{saving ? "Guardando…" : "Añadir acompañante"}</Text>
        </Pressable>
      </ScrollView>
    </ModalSheet>
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
    flexShrink: 1,
    textAlign: "right",
    marginLeft: 12,
  },
  notes: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  guestActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  travelerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  travelerInfo: {
    flex: 1,
  },
  travelerName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
  travelerMeta: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  travelerDelete: {
    alignSelf: "flex-start",
  },
  travelerDeleteText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: "600",
  },
  addTravelerButton: {
    marginTop: 4,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textMuted,
    marginBottom: 6,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase",
    marginTop: 6,
    marginBottom: 8,
  },
  sexPickerRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  sexChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  sexChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  sexChipText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "600",
  },
  sexChipTextActive: {
    color: colors.primaryText,
    fontSize: 13,
    fontWeight: "700",
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 14,
  },
  switchLabel: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
  },
  addressBox: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
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
