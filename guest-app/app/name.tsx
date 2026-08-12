// app/name.tsx
// Se muestra solo la primera vez que se usa un código de acceso vigente
// (Booking.guestDisplayName a null) — ver lib/auth-context.tsx. Al
// regenerarse el código desde la web/app de staff, esta pantalla vuelve a
// aparecer la próxima vez que alguien entre con el código nuevo.

import { useState } from "react";
import {
  Ionicons,
} from "@expo/vector-icons";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/Button";
import { useAuth } from "@/lib/auth-context";
import { colors, fonts, spacing } from "@/lib/theme";

export default function NameScreen() {
  const insets = useSafeAreaInsets();
  const { submitName } = useAuth();
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!name.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await submitName(name.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el nombre.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 24 }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.content}>
        <View style={styles.rule} />
        <Text style={styles.eyebrow}>Primera estancia</Text>
        <Text style={styles.title}>¿Cómo te llamamos{"\n"}durante tu estancia?</Text>
        <Text style={styles.subtitle}>
          Tu nombre aparecerá en los saludos y en las comunicaciones con recepción.
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Tu nombre"
          placeholderTextColor={colors.textMuted}
          value={name}
          onChangeText={setName}
          onSubmitEditing={handleSubmit}
          autoFocus
          returnKeyType="done"
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button
          label="Comenzar mi estancia"
          onPress={handleSubmit}
          disabled={!name.trim()}
          loading={submitting}
        />
      </View>

      <View style={styles.privacyNote}>
        <Ionicons name="time-outline" size={16} color={colors.textMuted} />
        <Text style={styles.privacyText}>
          Solo se usa para personalizar tu experiencia. No compartimos tus datos con terceros.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    justifyContent: "space-between",
  },
  content: { gap: spacing.md },
  rule: {
    width: 40,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.accent,
    marginBottom: spacing.sm,
  },
  eyebrow: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 12,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: colors.accent,
  },
  title: {
    fontFamily: fonts.serifBold,
    fontSize: 32,
    lineHeight: 38,
    color: colors.text,
  },
  subtitle: {
    fontFamily: fonts.sansRegular,
    fontSize: 15,
    lineHeight: 21,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontFamily: fonts.sansMedium,
    fontSize: 17,
    color: colors.text,
  },
  error: {
    fontFamily: fonts.sansMedium,
    color: colors.danger,
    fontSize: 14,
  },
  privacyNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  privacyText: {
    flex: 1,
    fontFamily: fonts.sansRegular,
    fontSize: 12,
    lineHeight: 17,
    color: colors.textMuted,
  },
});
