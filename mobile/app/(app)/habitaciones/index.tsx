import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as api from "@/lib/api";
import { Badge } from "@/components/Badge";
import { ScreenHeader } from "@/components/ScreenHeader";
import { colors, fonts } from "@/lib/theme";
import type { CleaningRoom } from "@/lib/types";

const ROOM_TYPE_LABELS: Record<string, string> = {
  DOUBLE: "Habitación doble",
  APARTMENT: "Apartamento",
};

export default function HabitacionesScreen() {
  const insets = useSafeAreaInsets();
  const [rooms, setRooms] = useState<CleaningRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api.fetchCleaningStatus();
      setRooms(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar habitaciones.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function toggleClean(room: CleaningRoom) {
    setUpdatingId(room.id);
    const previous = rooms;
    setRooms((rs) => rs.map((r) => (r.id === room.id ? { ...r, isClean: !r.isClean } : r)));
    try {
      await api.setRoomClean(room.id, !room.isClean);
    } catch (err) {
      setRooms(previous);
      setError(err instanceof Error ? err.message : "No se pudo actualizar.");
    } finally {
      setUpdatingId(null);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.headerWrap, { paddingTop: insets.top + 12, paddingLeft: 16 + insets.left, paddingRight: 16 + insets.right }]}>
        <ScreenHeader eyebrow="Estado" title="Habitaciones" />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={rooms}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const occupant = item.bookings[0];
          return (
            <View style={styles.card}>
              <View style={styles.cardInfo}>
                <View style={styles.nameRow}>
                  <Text style={styles.name}>{item.name}</Text>
                  {occupant ? <Badge label="Ocupada" tone="green" /> : null}
                </View>
                <Text style={styles.type}>{ROOM_TYPE_LABELS[item.type] ?? item.type}</Text>
                {occupant ? (
                  <View style={styles.guestChip}>
                    <Ionicons name="person-outline" size={12} color={colors.textMuted} />
                    <Text style={styles.guestChipText}>
                      {occupant.guest.firstName} {occupant.guest.lastName}
                    </Text>
                  </View>
                ) : null}
              </View>
              <View style={styles.switchWrap}>
                <Switch
                  value={item.isClean}
                  onValueChange={() => toggleClean(item)}
                  disabled={updatingId === item.id}
                  trackColor={{ false: colors.border, true: colors.primary }}
                />
                <Text style={[styles.status, item.isClean ? styles.clean : styles.dirty]}>
                  {item.isClean ? "Limpia" : "Sucia"}
                </Text>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerWrap: {
    paddingHorizontal: 16,
    backgroundColor: colors.background,
  },
  list: {
    padding: 16,
    paddingTop: 4,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  error: {
    color: colors.danger,
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
  cardInfo: {
    flexShrink: 1,
    gap: 6,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  name: {
    fontFamily: fonts.serifSemiBold,
    fontSize: 17,
    color: colors.text,
  },
  type: {
    fontSize: 13,
    color: colors.textMuted,
  },
  guestChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.background,
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  guestChipText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  switchWrap: {
    alignItems: "center",
    gap: 6,
  },
  status: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  clean: {
    color: colors.success,
  },
  dirty: {
    color: colors.textMuted,
  },
});
