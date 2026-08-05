import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Avatar } from "@/components/Avatar";
import { StatusBadge } from "@/components/StatusBadge";
import { formatMoney, formatShortDate } from "@/lib/date";
import { colors, fonts } from "@/lib/theme";
import type { Booking } from "@/lib/types";

const SOURCE_LABELS: Record<string, string> = {
  WEB: "Web",
  BOOKING: "Booking",
  AIRBNB: "Airbnb",
  MANUAL: "Manual",
  CHANNEX: "Channex",
  PHONE: "Teléfono",
};

export function BookingCard({ booking }: { booking: Booking }) {
  const guestName = `${booking.guest.firstName} ${booking.guest.lastName}`;

  return (
    <Pressable style={styles.card} onPress={() => router.push(`/reservas/${booking.id}`)}>
      <View style={styles.topRow}>
        <Avatar name={guestName} />
        <View style={styles.nameCol}>
          <Text style={styles.name}>{guestName}</Text>
          <View style={styles.roomRow}>
            <Ionicons name="bed-outline" size={13} color={colors.textMuted} />
            <Text style={styles.roomText}>{booking.room?.name ?? booking.roomType}</Text>
          </View>
        </View>
        <StatusBadge status={booking.status} />
      </View>

      <View style={styles.divider} />

      <View style={styles.bottomRow}>
        <View>
          <Text style={styles.metaLabel}>Fechas</Text>
          <Text style={styles.metaValue}>
            {formatShortDate(booking.checkInDate)} - {formatShortDate(booking.checkOutDate)}
          </Text>
        </View>
        <View>
          <Text style={styles.metaLabel}>Origen</Text>
          <Text style={styles.metaValue}>{SOURCE_LABELS[booking.source] ?? booking.source}</Text>
        </View>
        <Text style={styles.amount}>{formatMoney(booking.totalAmount)}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: "#1F2421",
        shadowOpacity: 0.06,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
      },
      android: { elevation: 1 },
    }),
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  nameCol: {
    flex: 1,
  },
  name: {
    fontFamily: fonts.serifSemiBold,
    fontSize: 16,
    color: colors.text,
  },
  roomRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  roomText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 12,
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  metaLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: colors.textMuted,
    marginBottom: 3,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
    marginRight: 20,
  },
  amount: {
    marginLeft: "auto",
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
});
