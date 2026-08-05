// app/sign-in.tsx
// Login con las mismas credenciales que /admin/login en la web.

import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
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
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/lib/auth-context";
import { fonts } from "@/lib/theme";

export default function SignInScreen() {
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!email || !password) return;
    setSubmitting(true);
    setError(null);
    try {
      await signIn(email.trim(), password);
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
        source={require("@/assets/images/login-background.jpg")}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        blurRadius={2}
      />
      <LinearGradient
        colors={[
          "rgba(12,24,18,0.35)",
          "rgba(12,24,18,0.55)",
          "rgba(10,20,15,0.82)",
        ]}
        locations={[0, 0.45, 1]}
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
            <View style={styles.logoBadge}>
              <Ionicons name="bed-outline" size={26} color="#FFFFFF" />
            </View>
            <Text style={styles.eyebrow}>Casa de Aldea</Text>
            <Text style={styles.title}>Villalén</Text>
            <Text style={styles.subtitle}>Sistema de gestión</Text>
          </View>

          <BlurView intensity={40} tint="dark" style={styles.card}>
            <Text style={styles.fieldLabel}>Correo electrónico</Text>
            <View style={styles.inputRow}>
              <Ionicons name="mail-outline" size={18} color="rgba(255,255,255,0.7)" />
              <TextInput
                style={styles.input}
                placeholder="tu@villalen.es"
                placeholderTextColor="rgba(255,255,255,0.5)"
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <Text style={styles.fieldLabel}>Contraseña</Text>
            <View style={styles.inputRow}>
              <Ionicons name="lock-closed-outline" size={18} color="rgba(255,255,255,0.7)" />
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor="rgba(255,255,255,0.5)"
                secureTextEntry={!showPassword}
                autoComplete="password"
                value={password}
                onChangeText={setPassword}
                onSubmitEditing={handleSubmit}
              />
              <Pressable onPress={() => setShowPassword((s) => !s)} hitSlop={8}>
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={18}
                  color="rgba(255,255,255,0.7)"
                />
              </Pressable>
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable
              style={[styles.button, submitting && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#1E3D2E" />
              ) : (
                <Text style={styles.buttonText}>Entrar al panel</Text>
              )}
            </Pressable>
          </BlurView>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0F1D16",
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  hero: {
    alignItems: "center",
    marginBottom: 28,
  },
  logoBadge: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.8)",
    marginBottom: 6,
  },
  title: {
    fontFamily: fonts.serifBold,
    fontSize: 40,
    color: "#FFFFFF",
  },
  subtitle: {
    fontSize: 15,
    color: "rgba(255,255,255,0.85)",
    marginTop: 4,
  },
  card: {
    borderRadius: 24,
    padding: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.65)",
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginBottom: 18,
  },
  input: {
    flex: 1,
    paddingVertical: 13,
    fontSize: 16,
    color: "#FFFFFF",
  },
  error: {
    color: "#F3B6A8",
    marginBottom: 12,
    marginTop: -8,
    fontSize: 14,
  },
  button: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#1E3D2E",
    fontSize: 16,
    fontWeight: "700",
  },
});
