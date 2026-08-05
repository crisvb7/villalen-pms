import { useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "expo-router";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as api from "@/lib/api";
import { Avatar } from "@/components/Avatar";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { ScreenHeader } from "@/components/ScreenHeader";
import { TextField } from "@/components/TextField";
import { colors, fonts } from "@/lib/theme";
import type { Guest } from "@/lib/types";

export default function HuespedesScreen() {
  const insets = useSafeAreaInsets();
  const [guests, setGuests] = useState<Guest[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api.fetchGuests();
      setGuests(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar huéspedes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return guests;
    return guests.filter((g) =>
      `${g.firstName} ${g.lastName} ${g.email} ${g.documentId}`.toLowerCase().includes(q)
    );
  }, [guests, query]);

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
        <ScreenHeader eyebrow="Gestión" title="Huéspedes" showBack />
        <TextField
          label=""
          placeholder="Buscar por nombre, email o documento"
          value={query}
          onChangeText={setQuery}
          style={styles.searchInput}
        />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={filtered}
        keyExtractor={(g) => g.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <Avatar name={`${item.firstName} ${item.lastName}`} />
            <View style={styles.info}>
              <Text style={styles.name}>
                {item.firstName} {item.lastName}
              </Text>
              <Text style={styles.meta}>{item.email}</Text>
              {item.phone ? <Text style={styles.meta}>{item.phone}</Text> : null}
              <Text style={styles.meta}>{item.documentId}</Text>
            </View>
          </Card>
        )}
        ListEmptyComponent={
          <EmptyState icon="people-outline" text="No hay huéspedes que coincidan con la búsqueda." />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  headerWrap: {
    paddingHorizontal: 16,
  },
  searchInput: {
    marginBottom: 0,
  },
  error: {
    color: colors.danger,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  list: {
    padding: 16,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  info: {
    flex: 1,
  },
  name: {
    fontFamily: fonts.serifSemiBold,
    fontSize: 16,
    color: colors.text,
    marginBottom: 2,
  },
  meta: {
    fontSize: 13,
    color: colors.textMuted,
  },
});
