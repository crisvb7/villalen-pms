// app/(app)/recepcion.tsx
// Chat con recepción. FlatList invertida (patrón estándar de chat): la
// lista se pasa en orden "más nuevo primero" + inverted, así los mensajes
// nuevos anclan abajo sin tener que hacer scrollToEnd a mano.

import { memo, useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as api from "@/lib/api";
import { colors, fonts, radii, spacing } from "@/lib/theme";
import type { GuestMessage } from "@/lib/types";

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

const Bubble = memo(function Bubble({ message }: { message: GuestMessage }) {
  const isGuest = message.sender === "GUEST";
  return (
    <View style={[styles.bubbleRow, isGuest ? styles.bubbleRowRight : styles.bubbleRowLeft]}>
      <View style={[styles.bubble, isGuest ? styles.bubbleGuest : styles.bubbleStaff]}>
        <Text style={[styles.bubbleText, isGuest && styles.bubbleTextOnDark]}>{message.body}</Text>
      </View>
      <Text style={styles.time}>{formatTime(message.createdAt)}</Text>
    </View>
  );
});

export default function RecepcionScreen() {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<GuestMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.fetchMessages();
      setMessages(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function handleSend() {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setDraft("");
    try {
      const { data } = await api.sendMessage(body);
      setMessages((prev) => [...prev, data]);
    } catch {
      setDraft(body); // devolvemos el texto al composer si falla el envío
    } finally {
      setSending(false);
    }
  }

  const renderItem = useCallback(({ item }: { item: GuestMessage }) => <Bubble message={item} />, []);

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={insets.top}
    >
      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ flex: 1 }} />
      ) : messages.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="chatbubble-ellipses-outline" size={32} color={colors.textMuted} />
          <Text style={styles.emptyText}>
            Escríbenos si necesitas cualquier cosa durante tu estancia.
          </Text>
        </View>
      ) : (
        <FlatList
          data={[...messages].reverse()}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          inverted
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        />
      )}

      <View style={[styles.composer, { paddingBottom: insets.bottom + spacing.sm }]}>
        <TextInput
          style={styles.input}
          placeholder="Escribe un mensaje…"
          placeholderTextColor={colors.textMuted}
          value={draft}
          onChangeText={setDraft}
          multiline
        />
        <Pressable
          onPress={handleSend}
          disabled={!draft.trim() || sending}
          style={[styles.sendButton, (!draft.trim() || sending) && styles.sendButtonDisabled]}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="send" size={18} color="#FFFFFF" />
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl, gap: spacing.sm },
  emptyText: { fontFamily: fonts.sansRegular, fontSize: 14, color: colors.textMuted, textAlign: "center" },
  bubbleRow: { maxWidth: "80%" },
  bubbleRowLeft: { alignSelf: "flex-start", alignItems: "flex-start" },
  bubbleRowRight: { alignSelf: "flex-end", alignItems: "flex-end" },
  bubble: { borderRadius: radii.lg, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleStaff: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: 4,
  },
  bubbleGuest: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  bubbleText: { fontFamily: fonts.sansRegular, fontSize: 15, lineHeight: 20, color: colors.text },
  bubbleTextOnDark: { color: "#FFFFFF" },
  time: { fontFamily: fonts.sansRegular, fontSize: 11, color: colors.textMuted, marginTop: 4 },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontFamily: fonts.sansRegular,
    fontSize: 15,
    color: colors.text,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: { opacity: 0.5 },
});
