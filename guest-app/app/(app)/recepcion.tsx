// app/(app)/recepcion.tsx
// Chat con recepción. FlatList invertida (patrón estándar de chat): la
// lista se pasa en orden "más nuevo primero" + inverted, así los mensajes
// nuevos anclan abajo sin tener que hacer scrollToEnd a mano.
//
// Toques "vivos" tomados de WhatsApp: las burbujas entran con un pequeño
// resorte (solo las nuevas — las ya montadas no se re-animan porque
// FlatList no las remonta), los mensajes propios llevan check simple/doble
// según `readAt`, se puede deslizar cualquier burbuja hacia la derecha para
// responder a ella (con vibración al cruzar el umbral, como en WhatsApp),
// y el fondo del chat se refresca solo cada pocos segundos mientras la
// pantalla está enfocada, para que las respuestas de recepción aparezcan
// sin tirar de pull-to-refresh.

import { memo, useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  KeyboardAvoidingView,
  PanResponder,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as api from "@/lib/api";
import { colors, fonts, radii, spacing } from "@/lib/theme";
import type { GuestMessage } from "@/lib/types";

const POLL_INTERVAL_MS = 6000;
const SWIPE_TRIGGER = 56; // px arrastrados para que soltar dispare "responder"
const SWIPE_MAX = 72; // tope del arrastre (con resistencia visual, como WhatsApp)

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

function quoteLabel(sender: GuestMessage["sender"]): string {
  return sender === "GUEST" ? "Tú" : "Recepción";
}

const Bubble = memo(function Bubble({
  message,
  onReply,
}: {
  message: GuestMessage;
  onReply: (message: GuestMessage) => void;
}) {
  const isGuest = message.sender === "GUEST";
  const mount = useRef(new Animated.Value(0)).current;
  const dragX = useRef(new Animated.Value(0)).current;
  const hapticFired = useRef(false);

  useEffect(() => {
    Animated.spring(mount, {
      toValue: 1,
      useNativeDriver: true,
      friction: 7,
      tension: 100,
    }).start();
  }, [mount]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        gesture.dx > 6 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5,
      onPanResponderMove: (_, gesture) => {
        const dx = Math.max(0, Math.min(gesture.dx, SWIPE_MAX));
        dragX.setValue(dx);
        if (dx >= SWIPE_TRIGGER && !hapticFired.current) {
          hapticFired.current = true;
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } else if (dx < SWIPE_TRIGGER) {
          hapticFired.current = false;
        }
      },
      onPanResponderRelease: (_, gesture) => {
        const dx = Math.max(0, gesture.dx);
        Animated.spring(dragX, { toValue: 0, useNativeDriver: false, friction: 7, tension: 90 }).start();
        if (dx >= SWIPE_TRIGGER) onReply(message);
      },
      onPanResponderTerminate: () => {
        Animated.spring(dragX, { toValue: 0, useNativeDriver: false }).start();
      },
    })
  ).current;

  const iconOpacity = dragX.interpolate({ inputRange: [0, SWIPE_TRIGGER], outputRange: [0, 1], extrapolate: "clamp" });
  const iconScale = dragX.interpolate({
    inputRange: [0, SWIPE_TRIGGER * 0.6, SWIPE_TRIGGER],
    outputRange: [0.4, 0.4, 1],
    extrapolate: "clamp",
  });

  return (
    <View style={[styles.swipeRow, { justifyContent: isGuest ? "flex-end" : "flex-start" }]}>
      <Animated.View style={[styles.replySpacer, { width: dragX }]} pointerEvents="none">
        <Animated.View style={{ opacity: iconOpacity, transform: [{ scale: iconScale }] }}>
          <Ionicons name="arrow-undo" size={16} color={colors.textMuted} />
        </Animated.View>
      </Animated.View>
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.bubbleRow,
          isGuest ? styles.bubbleRowRight : styles.bubbleRowLeft,
          {
            opacity: mount,
            transform: [
              { translateY: mount.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) },
              { scale: mount.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) },
            ],
          },
        ]}
      >
        <View style={[styles.bubble, isGuest ? styles.bubbleGuest : styles.bubbleStaff]}>
          {message.replyTo && (
            <View style={[styles.quote, isGuest && styles.quoteOnDark]}>
              <Text style={[styles.quoteSender, isGuest && styles.quoteSenderOnDark]}>
                {quoteLabel(message.replyTo.sender)}
              </Text>
              <Text style={[styles.quoteBody, isGuest && styles.quoteBodyOnDark]} numberOfLines={1}>
                {message.replyTo.body}
              </Text>
            </View>
          )}
          <Text style={[styles.bubbleText, isGuest && styles.bubbleTextOnDark]}>{message.body}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.time}>{formatTime(message.createdAt)}</Text>
          {isGuest && (
            <Ionicons
              name={message.readAt ? "checkmark-done" : "checkmark"}
              size={14}
              color={message.readAt ? colors.accent : colors.textMuted}
              style={styles.tick}
            />
          )}
        </View>
      </Animated.View>
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
  const [inputFocused, setInputFocused] = useState(false);
  const [replyTarget, setReplyTarget] = useState<GuestMessage | null>(null);
  const sendScale = useRef(new Animated.Value(1)).current;
  const replyBarAnim = useRef(new Animated.Value(0)).current;
  const emptyPulse = useRef(new Animated.Value(0)).current;

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

  // Refresco silencioso mientras la pestaña está abierta, para que las
  // respuestas de recepción lleguen solas (sin loading — `load` solo lo usa
  // en la carga inicial).
  useFocusEffect(
    useCallback(() => {
      const id = setInterval(load, POLL_INTERVAL_MS);
      return () => clearInterval(id);
    }, [load])
  );

  useEffect(() => {
    Animated.spring(replyBarAnim, {
      toValue: replyTarget ? 1 : 0,
      useNativeDriver: true,
      friction: 8,
      tension: 100,
    }).start();
  }, [replyTarget, replyBarAnim]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(emptyPulse, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(emptyPulse, { toValue: 0, duration: 1200, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [emptyPulse]);

  async function handleRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const handleReply = useCallback((message: GuestMessage) => {
    Haptics.selectionAsync();
    setReplyTarget(message);
  }, []);

  function handleCancelReply() {
    setReplyTarget(null);
  }

  async function handleSend() {
    const body = draft.trim();
    if (!body || sending) return;
    const replyToId = replyTarget?.id ?? null;
    setSending(true);
    setDraft("");
    setReplyTarget(null);
    try {
      const { data } = await api.sendMessage(body, replyToId);
      setMessages((prev) => [...prev, data]);
    } catch {
      setDraft(body); // devolvemos el texto al composer si falla el envío
    } finally {
      setSending(false);
    }
  }

  const renderItem = useCallback(
    ({ item }: { item: GuestMessage }) => <Bubble message={item} onReply={handleReply} />,
    [handleReply]
  );

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
          <Animated.View
            style={{
              opacity: emptyPulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }),
              transform: [{ scale: emptyPulse.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.06] }) }],
            }}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={32} color={colors.textMuted} />
          </Animated.View>
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

      {replyTarget && (
        <Animated.View
          style={[
            styles.replyBar,
            {
              opacity: replyBarAnim,
              transform: [{ translateY: replyBarAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
            },
          ]}
        >
          <View style={styles.replyBarAccent} />
          <View style={styles.replyBarContent}>
            <Text style={styles.replyBarSender}>{quoteLabel(replyTarget.sender)}</Text>
            <Text style={styles.replyBarBody} numberOfLines={1}>
              {replyTarget.body}
            </Text>
          </View>
          <Pressable onPress={handleCancelReply} hitSlop={10} style={styles.replyBarClose}>
            <Ionicons name="close" size={18} color={colors.textMuted} />
          </Pressable>
        </Animated.View>
      )}

      <View style={[styles.composer, { paddingBottom: insets.bottom + spacing.sm }]}>
        <TextInput
          style={[styles.input, inputFocused && styles.inputFocused]}
          placeholder="Escribe un mensaje…"
          placeholderTextColor={colors.textMuted}
          value={draft}
          onChangeText={setDraft}
          onFocus={() => setInputFocused(true)}
          onBlur={() => setInputFocused(false)}
          multiline
        />
        <Pressable
          onPress={handleSend}
          onPressIn={() => Animated.spring(sendScale, { toValue: 0.86, useNativeDriver: true }).start()}
          onPressOut={() => Animated.spring(sendScale, { toValue: 1, friction: 4, useNativeDriver: true }).start()}
          disabled={!draft.trim() || sending}
        >
          <Animated.View
            style={[
              styles.sendButton,
              (!draft.trim() || sending) && styles.sendButtonDisabled,
              { transform: [{ scale: sendScale }] },
            ]}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="send" size={18} color="#FFFFFF" />
            )}
          </Animated.View>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.primarySurface },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl, gap: spacing.sm },
  emptyText: { fontFamily: fonts.sansRegular, fontSize: 14, color: colors.textMuted, textAlign: "center" },
  swipeRow: { flexDirection: "row", alignItems: "center" },
  replySpacer: { alignItems: "center", justifyContent: "center", overflow: "hidden" },
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
  quote: {
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
    backgroundColor: colors.accentSurface,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    marginBottom: 6,
  },
  quoteOnDark: { backgroundColor: "rgba(255,255,255,0.12)", borderLeftColor: "rgba(255,255,255,0.7)" },
  quoteSender: { fontFamily: fonts.sansSemiBold, fontSize: 12, color: colors.accent },
  quoteSenderOnDark: { color: colors.textOnDark },
  quoteBody: { fontFamily: fonts.sansRegular, fontSize: 13, color: colors.textMuted },
  quoteBodyOnDark: { color: colors.textOnDarkMuted },
  metaRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  time: { fontFamily: fonts.sansRegular, fontSize: 11, color: colors.textMuted },
  tick: { marginLeft: 3 },
  replyBar: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    gap: spacing.sm,
  },
  replyBarAccent: { width: 3, alignSelf: "stretch", borderRadius: radii.sm, backgroundColor: colors.accent },
  replyBarContent: { flex: 1 },
  replyBarSender: { fontFamily: fonts.sansSemiBold, fontSize: 12, color: colors.accent },
  replyBarBody: { fontFamily: fonts.sansRegular, fontSize: 13, color: colors.textMuted, marginTop: 1 },
  replyBarClose: { padding: spacing.xs },
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
  inputFocused: { borderColor: colors.accent, borderWidth: 1.5 },
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
