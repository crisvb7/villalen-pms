// app/login.tsx
// Login del huésped: un único código de acceso (lo genera el personal desde
// la web o la app de staff), sin email ni contraseña. Ver lib/auth-context.tsx.

import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/Button";
import { useAuth } from "@/lib/auth-context";
import { colors, fonts } from "@/lib/theme";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { signInWithCode } = useAuth();
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (code.trim().length < 4) return;
    setSubmitting(true);
    setError(null);
    try {
      await signInWithCode(code.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesión.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <Image
        source={require("@/assets/images/hero-exterior.jpg")}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
      />
      <LinearGradient
        colors={["rgba(15,25,22,0.35)", "rgba(15,25,22,0.55)", "rgba(10,18,16,0.88)"]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: 24 + insets.top,
              paddingBottom: 24 + insets.bottom,
              paddingLeft: 24 + insets.left,
              paddingRight: 24 + insets.right,
            },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.hero}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>CA · Villalén</Text>
            </View>
            <Text style={styles.eyebrow}>Cuerres · Ribadesella · Asturias</Text>
            <Text style={styles.title}>Bienvenido{"\n"}a tu estancia</Text>
            <Text style={styles.subtitle}>
              Introduce el código que te ha facilitado el equipo de Villalén.
            </Text>
          </View>

          <BlurView intensity={40} tint="dark" style={styles.card}>
            <Text style={styles.fieldLabel}>Código de acceso</Text>
            <TextInput
              style={styles.codeInput}
              placeholder="• • • • • •"
              placeholderTextColor="rgba(255,255,255,0.35)"
              keyboardType="number-pad"
              maxLength={6}
              value={code}
              onChangeText={setCode}
              onSubmitEditing={handleSubmit}
              autoFocus
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Button
              label="Continuar"
              onPress={handleSubmit}
              disabled={code.trim().length < 4}
              loading={submitting}
            />
          </BlurView>

          <Text style={styles.footer}>
            ¿No tienes código? Llama a recepción: +34 985 861 XXX
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0F1D16" },
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: "center" },
  hero: { marginBottom: 28 },
  badge: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 16,
  },
  badgeText: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 13,
    color: "#FFFFFF",
  },
  eyebrow: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 12,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.75)",
    marginBottom: 10,
  },
  title: {
    fontFamily: fonts.serifBold,
    fontSize: 38,
    lineHeight: 44,
    color: "#FFFFFF",
    marginBottom: 12,
  },
  subtitle: {
    fontFamily: fonts.sansRegular,
    fontSize: 16,
    lineHeight: 22,
    color: "rgba(255,255,255,0.85)",
  },
  card: {
    borderRadius: 24,
    padding: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    gap: 14,
  },
  fieldLabel: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.65)",
  },
  codeInput: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingVertical: 16,
    fontFamily: fonts.sansSemiBold,
    fontSize: 26,
    letterSpacing: 10,
    textAlign: "center",
    color: "#FFFFFF",
  },
  error: {
    fontFamily: fonts.sansMedium,
    color: "#F3B6A8",
    fontSize: 14,
  },
  footer: {
    fontFamily: fonts.sansRegular,
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
    marginTop: 24,
  },
});
