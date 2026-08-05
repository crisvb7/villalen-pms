// components/calendar/CalendarView.tsx
// Vista de calendario (habitación × día) para la pantalla Reservas — misma
// funcionalidad que app/admin/calendario en la web: navegación por semana,
// alta rápida tocando una celda libre, y modo edición para mover una
// reserva a otra habitación/fecha (tocar para seleccionar, tocar el
// destino para soltar — el equivalente táctil del "arrastrar y soltar").

import { useCallback, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as api from "@/lib/api";
import { CalendarGrid } from "@/components/calendar/CalendarGrid";
import { QuickCreateModal } from "@/components/calendar/QuickCreateModal";
import {
  addDays,
  differenceInCalendarDays,
  eachDayOfInterval,
  mondayOfWeek,
  toISODate,
} from "@/lib/date";
import { colors, statusLabels, statusTones, tones } from "@/lib/theme";
import type { Booking, Room } from "@/lib/types";

const WINDOW_DAYS = 7;

const LEGEND: { label: string; tone: keyof typeof tones }[] = [
  { label: statusLabels.PENDING, tone: statusTones.PENDING },
  { label: statusLabels.CONFIRMED, tone: statusTones.CONFIRMED },
  { label: statusLabels.CHECKED_IN, tone: statusTones.CHECKED_IN },
  { label: statusLabels.CHECKED_OUT, tone: statusTones.CHECKED_OUT },
];

export function CalendarView() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const [weekStart, setWeekStart] = useState(() => mondayOfWeek(new Date()));
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [quickCreateTarget, setQuickCreateTarget] = useState<{ room: Room; date: Date } | null>(
    null
  );
  const [moving, setMoving] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [bookingsRes, roomsRes] = await Promise.all([api.fetchBookings(), api.fetchRooms()]);
      setBookings(bookingsRes.data.filter((b) => b.status !== "CANCELLED"));
      setRooms(roomsRes.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar el calendario.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const days = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, WINDOW_DAYS - 1) });

  async function handleCellPress(room: Room, day: Date, booking: Booking | undefined) {
    if (editMode) {
      if (booking) {
        setSelectedBookingId((id) => (id === booking.id ? null : booking.id));
        return;
      }
      if (!selectedBookingId) return;
      const selected = bookings.find((b) => b.id === selectedBookingId);
      if (!selected) return;
      if (selected.roomType !== room.type) {
        Alert.alert(
          "Habitación no compatible",
          `Esta reserva es de tipo ${selected.roomType}, no se puede mover a ${room.name}.`
        );
        return;
      }
      const nights = differenceInCalendarDays(
        new Date(selected.checkOutDate),
        new Date(selected.checkInDate)
      );
      setMoving(true);
      try {
        await api.updateBooking(selected.id, {
          roomId: room.id,
          checkInDate: toISODate(day),
          checkOutDate: toISODate(addDays(day, nights)),
        });
        setSelectedBookingId(null);
        await load();
      } catch (err) {
        Alert.alert("Error", err instanceof Error ? err.message : "No se pudo mover la reserva.");
      } finally {
        setMoving(false);
      }
      return;
    }

    if (booking) {
      router.push(`/reservas/${booking.id}`);
    } else {
      setQuickCreateTarget({ room, date: day });
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (rooms.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>No hay habitaciones configuradas.</Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        { paddingLeft: 16 + insets.left, paddingRight: 16 + insets.right },
      ]}
    >
      <View style={[styles.weekNav, isLandscape && styles.weekNavCompact]}>
        <Pressable style={styles.navButton} onPress={() => setWeekStart((d) => addDays(d, -WINDOW_DAYS))}>
          <Text style={styles.navButtonText}>‹</Text>
        </Pressable>
        <Pressable onPress={() => setWeekStart(mondayOfWeek(new Date()))}>
          <Text style={styles.weekLabel}>
            {formatRange(days[0], days[days.length - 1])}
          </Text>
        </Pressable>
        <Pressable style={styles.navButton} onPress={() => setWeekStart((d) => addDays(d, WINDOW_DAYS))}>
          <Text style={styles.navButtonText}>›</Text>
        </Pressable>
        <Pressable
          style={[styles.editToggle, editMode && styles.editToggleActive]}
          onPress={() => {
            setEditMode((v) => !v);
            setSelectedBookingId(null);
          }}
        >
          <Text style={[styles.editToggleText, editMode && styles.editToggleTextActive]}>
            {editMode ? "Listo" : "Editar"}
          </Text>
        </Pressable>
      </View>

      {isLandscape ? null : (
        <>
          <Text style={styles.hint}>
            {editMode
              ? selectedBookingId
                ? "Toca una celda libre para mover la reserva ahí."
                : "Toca una reserva para seleccionarla y moverla."
              : "Toca un día libre para crear una reserva."}
          </Text>

          <View style={styles.legend}>
            {LEGEND.map((l) => (
              <View key={l.label} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: tones[l.tone].fg }]} />
                <Text style={styles.legendText}>{l.label}</Text>
              </View>
            ))}
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.todayAccent }]} />
              <Text style={styles.legendText}>Hoy</Text>
            </View>
          </View>
        </>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <CalendarGrid
        rooms={rooms}
        bookings={bookings}
        days={days}
        editMode={editMode}
        selectedBookingId={selectedBookingId}
        onCellPress={handleCellPress}
        compact={isLandscape}
      />

      {moving ? (
        <View style={styles.movingOverlay}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : null}

      <QuickCreateModal
        target={quickCreateTarget}
        onClose={() => setQuickCreateTarget(null)}
        onCreated={() => {
          setQuickCreateTarget(null);
          load();
        }}
      />
    </View>
  );
}

function formatRange(start: Date, end: Date): string {
  const fmt = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short" });
  return `${fmt.format(start)} – ${fmt.format(end)}`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  weekNav: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  weekNavCompact: {
    marginBottom: 6,
  },
  navButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  navButtonText: {
    fontSize: 18,
    color: colors.text,
    fontWeight: "700",
  },
  weekLabel: {
    flex: 1,
    textAlign: "center",
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
    textTransform: "capitalize",
  },
  editToggle: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.surface,
  },
  editToggleActive: {
    backgroundColor: colors.primary,
  },
  editToggleText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
  },
  editToggleTextActive: {
    color: colors.primaryText,
  },
  hint: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 10,
  },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 12,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  error: {
    color: colors.danger,
    marginBottom: 8,
  },
  movingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(248,246,241,0.5)",
  },
});
