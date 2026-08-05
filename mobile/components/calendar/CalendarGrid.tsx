// components/calendar/CalendarGrid.tsx
// Rejilla habitación × día, equivalente móvil de app/admin/calendario en la
// web: cabecera de días y columna de habitaciones fijas, con el cuerpo
// desplazable en ambos ejes. La cabecera y la columna se mueven mediante
// `transform` impulsado por Animated con useNativeDriver — sincronizado en
// el hilo nativo, sin el lag/desajuste que tendría reenviar el scroll a
// otro ScrollView desde el hilo de JS.

import { useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import {
  formatDayNumber,
  formatWeekdayShort,
  isToday,
  isWeekend,
  startOfDay,
} from "@/lib/date";
import { colors, fonts, statusTones, tones } from "@/lib/theme";
import type { Booking, Room } from "@/lib/types";

export const ROOM_COL_WIDTH = 100;
export const DAY_COL_WIDTH = 64;
const ROW_HEIGHT = 60;
const ROW_HEIGHT_COMPACT = 42;
const HEADER_HEIGHT = 52;
const HEADER_HEIGHT_COMPACT = 38;

interface Props {
  rooms: Room[];
  bookings: Booking[];
  days: Date[];
  editMode: boolean;
  selectedBookingId: string | null;
  onCellPress: (room: Room, day: Date, booking: Booking | undefined) => void;
  /** Landscape en pantallas pequeñas: filas y cabecera más bajas para que
   * quepan varias habitaciones sin depender solo del scroll. */
  compact?: boolean;
}

function findBooking(bookings: Booking[], room: Room, day: Date): Booking | undefined {
  const d = startOfDay(day);
  return bookings.find((b) => {
    if (b.roomId !== room.id) return false;
    const ci = startOfDay(new Date(b.checkInDate));
    const co = startOfDay(new Date(b.checkOutDate));
    return d >= ci && d < co;
  });
}

// "Habitación 7" → "Hab. 7" — en la columna estrecha del calendario, el
// nombre completo se corta a "Habita…" y todas las dobles se ven iguales.
export function shortRoomName(name: string): string {
  const match = name.match(/^Habitaci[oó]n\s+(.+)$/i);
  return match ? `Hab. ${match[1]}` : name;
}

export function CalendarGrid({
  rooms,
  bookings,
  days,
  editMode,
  selectedBookingId,
  onCellPress,
  compact,
}: Props) {
  const scrollX = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(new Animated.Value(0)).current;
  const rowHeight = compact ? ROW_HEIGHT_COMPACT : ROW_HEIGHT;
  const headerHeight = compact ? HEADER_HEIGHT_COMPACT : HEADER_HEIGHT;

  return (
    <View style={styles.root}>
      <View style={[styles.headerRow, { height: headerHeight }]}>
        <View style={[styles.cornerCell, { width: ROOM_COL_WIDTH, height: headerHeight }]}>
          <Text style={styles.cornerText} numberOfLines={1}>
            Habitación
          </Text>
        </View>
        <View style={[styles.clip, { height: headerHeight }]}>
          <Animated.View
            style={[
              styles.headerDays,
              { height: headerHeight, transform: [{ translateX: Animated.multiply(scrollX, -1) }] },
            ]}
          >
            {days.map((day) => {
              const today = isToday(day);
              return (
                <View
                  key={day.toISOString()}
                  style={[
                    styles.dayHeaderCell,
                    { height: headerHeight },
                    today && styles.dayHeaderCellToday,
                    !today && isWeekend(day) && styles.weekendCell,
                  ]}
                >
                  <Text style={[styles.weekdayText, today && styles.todayText]}>
                    {formatWeekdayShort(day)}
                  </Text>
                  <Text style={[styles.dayNumberText, today && styles.todayText]}>
                    {formatDayNumber(day)}
                  </Text>
                </View>
              );
            })}
          </Animated.View>
        </View>
      </View>

      <View style={styles.body}>
        <View style={[styles.roomColClip, { width: ROOM_COL_WIDTH }]}>
          <Animated.View style={{ transform: [{ translateY: Animated.multiply(scrollY, -1) }] }}>
            {rooms.map((room) => (
              <View key={room.id} style={[styles.roomCell, { height: rowHeight }]}>
                <Text style={styles.roomName} numberOfLines={1}>
                  {shortRoomName(room.name)}
                </Text>
                {compact ? null : (
                  <Text style={styles.roomCapacity}>{room.capacity} pers.</Text>
                )}
              </View>
            ))}
          </Animated.View>
        </View>

        <Animated.ScrollView
          horizontal
          showsHorizontalScrollIndicator
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
            useNativeDriver: true,
          })}
          scrollEventThrottle={16}
        >
          <Animated.ScrollView
            showsVerticalScrollIndicator={false}
            onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
              useNativeDriver: true,
            })}
            scrollEventThrottle={16}
          >
            {rooms.map((room) => (
              <View key={room.id} style={[styles.row, { height: rowHeight }]}>
                {days.map((day) => {
                  const booking = findBooking(bookings, room, day);
                  const today = isToday(day);
                  const selected = booking && selectedBookingId === booking.id;
                  const tone = booking ? tones[statusTones[booking.status] ?? "gray"] : null;
                  return (
                    <Pressable
                      key={day.toISOString()}
                      style={[
                        styles.dayCell,
                        { height: rowHeight },
                        today && styles.dayCellToday,
                        !today && isWeekend(day) && styles.weekendCell,
                      ]}
                      onPress={() => onCellPress(room, day, booking)}
                    >
                      {booking ? (
                        <View
                          style={[
                            styles.bookingBar,
                            { backgroundColor: tone!.bg },
                            selected && styles.bookingBarSelected,
                          ]}
                        >
                          <Text style={[styles.bookingText, { color: tone!.fg }]} numberOfLines={1}>
                            {booking.guest.firstName}
                          </Text>
                        </View>
                      ) : editMode ? null : (
                        <View style={styles.freeCellHint} />
                      )}
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </Animated.ScrollView>
        </Animated.ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    overflow: "hidden",
  },
  headerRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  cornerCell: {
    justifyContent: "center",
    paddingHorizontal: 10,
    backgroundColor: colors.background,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  cornerText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: colors.textMuted,
  },
  clip: {
    flex: 1,
    overflow: "hidden",
  },
  headerDays: {
    flexDirection: "row",
  },
  dayHeaderCell: {
    width: DAY_COL_WIDTH,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  dayHeaderCellToday: {
    backgroundColor: colors.todayAccent,
  },
  weekendCell: {
    backgroundColor: "#F2EEE4",
  },
  weekdayText: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: colors.textMuted,
  },
  dayNumberText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    marginTop: 1,
  },
  todayText: {
    color: "#FFFFFF",
  },
  body: {
    flex: 1,
    flexDirection: "row",
  },
  roomColClip: {
    overflow: "hidden",
  },
  roomCell: {
    justifyContent: "center",
    paddingHorizontal: 10,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  roomName: {
    fontFamily: fonts.serifSemiBold,
    fontSize: 13,
    color: colors.text,
  },
  roomCapacity: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 1,
  },
  row: {
    flexDirection: "row",
  },
  dayCell: {
    width: DAY_COL_WIDTH,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    padding: 3,
  },
  dayCellToday: {
    backgroundColor: "#EFECFB",
  },
  freeCellHint: {
    width: "100%",
    height: "100%",
  },
  bookingBar: {
    width: "100%",
    height: "100%",
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  bookingBarSelected: {
    borderWidth: 2,
    borderColor: colors.text,
  },
  bookingText: {
    fontSize: 11,
    fontWeight: "700",
  },
});
