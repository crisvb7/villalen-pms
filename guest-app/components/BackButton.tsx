// components/BackButton.tsx
// Botón de volver propio (no el header nativo) para pantallas en pila con
// hero de imagen/color a pantalla completa arriba — flota sobre el hero.
// "overlay" (por defecto) = círculo translúcido para fondos oscuros/imagen;
// "solid" = fondo sólido de superficie, para pantallas con fondo claro.

import { Platform, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/lib/theme";

export function BackButton({ variant = "overlay" }: { variant?: "overlay" | "solid" }) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.base,
        variant === "overlay" ? styles.overlay : styles.solid,
        pressed && styles.pressed,
      ]}
      onPress={() => router.back()}
      hitSlop={8}
    >
      <Ionicons
        name="chevron-back"
        size={22}
        color={variant === "overlay" ? "#FFFFFF" : colors.text}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  overlay: {
    backgroundColor: "rgba(28,25,23,0.35)",
  },
  solid: {
    backgroundColor: colors.surface,
    ...Platform.select({
      ios: {
        shadowColor: colors.text,
        shadowOpacity: 0.1,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
      },
      android: { elevation: 2 },
    }),
  },
  pressed: { opacity: 0.7 },
});
