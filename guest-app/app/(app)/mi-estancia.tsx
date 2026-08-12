// app/(app)/mi-estancia.tsx
// Perfil / resumen de la reserva. Deliberadamente NO incluye wifi ni
// "normas de la casa": no hay ningún dato real de eso en el backend
// todavía y era peor inventar una contraseña de wifi o unas normas
// ficticias que no mostrar nada — ver nota en lib/establishment.ts.

import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { formatLongDate } from "@/lib/date";
import { useAuth } from "@/lib/auth-context";
import { ESTABLISHMENT } from "@/lib/establishment";
import { colors, fonts, spacing } from "@/lib/theme";

function nightsBetween(checkIn: string, checkOut: string): number {
  const ms = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
}

export default function MiEstanciaScreen() {
  const insets = useSafeAreaInsets();
  const { booking, signOut } = useAuth();

  if (!booking) return null;

  const nights = nightsBetween(booking.checkInDate, booking.checkOutDate);
  const initial = (booking.guestDisplayName ?? "?").charAt(0).toUpperCase();

  function handleSignOut() {
    Alert.alert("Cerrar sesión", "¿Seguro que quieres salir?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Cerrar sesión", style: "destructive", onPress: signOut },
    ]);
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingBottom: insets.bottom + spacing.xl,
      }}
    >
      <View style={[styles.header, { paddingTop: insets.top + spacing.lg }]}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <View>
          <Text style={styles.name}>{booking.guestDisplayName}</Text>
          <Text style={styles.meta}>
            {booking.roomName} · {nights} noche{nights !== 1 ? "s" : ""}
          </Text>
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionLabel}>Mi reserva</Text>
        <Card style={{ gap: spacing.sm }}>
          <Row icon="home-outline" label="Habitación" value={booking.roomName} />
          <Divider />
          <Row icon="log-in-outline" label="Check-in" value={formatLongDate(booking.checkInDate)} />
          <Divider />
          <Row icon="log-out-outline" label="Check-out" value={formatLongDate(booking.checkOutDate)} />
          <Divider />
          <Row icon="moon-outline" label="Noches" value={`${nights}`} />
        </Card>

        <Text style={styles.sectionLabel}>Horarios</Text>
        <Card style={{ gap: spacing.sm }}>
          <Row icon="time-outline" label="Entrada" value={`A partir de las ${ESTABLISHMENT.checkInTime}`} />
          <Divider />
          <Row icon="time-outline" label="Salida" value={`Antes de las ${ESTABLISHMENT.checkOutTime}`} />
        </Card>

        <Text style={styles.sectionLabel}>Contacto</Text>
        <Card style={{ gap: spacing.sm }}>
          <Row icon="call-outline" label="Recepción" value={ESTABLISHMENT.phone} />
          <Divider />
          <Row icon="medkit-outline" label="Emergencias" value="112" />
        </Card>

        <View style={{ marginTop: spacing.lg }}>
          <Button label="Cerrar sesión" variant="ghost" onPress={handleSignOut} />
        </View>
      </View>
    </ScrollView>
  );
}

function Row({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={18} color={colors.textMuted} />
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontFamily: fonts.serifBold, fontSize: 22, color: "#FFFFFF" },
  name: { fontFamily: fonts.serifBold, fontSize: 22, color: colors.text },
  meta: { fontFamily: fonts.sansRegular, fontSize: 13, color: colors.textMuted, marginTop: 2 },
  content: { paddingHorizontal: spacing.lg },
  sectionLabel: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: colors.textMuted,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  rowLabel: { flex: 1, fontFamily: fonts.sansRegular, fontSize: 14, color: colors.textMuted },
  rowValue: { fontFamily: fonts.sansSemiBold, fontSize: 14, color: colors.text },
  divider: { height: 1, backgroundColor: colors.border },
});
