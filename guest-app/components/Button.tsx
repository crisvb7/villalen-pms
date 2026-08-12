// components/Button.tsx
// Botón táctil de 56px de alto (por encima del mínimo de 44-48pt) con
// feedback de ripple en Android (no existe en iOS, es lo esperado).

import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fonts, radii } from "@/lib/theme";

type Variant = "primary" | "secondary" | "ghost";

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
}

export function Button({
  label,
  onPress,
  variant = "primary",
  disabled,
  loading,
  icon,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      android_ripple={{ color: "rgba(255,255,255,0.2)" }}
      style={({ pressed }) => [
        styles.base,
        variantStyles[variant],
        isDisabled && styles.disabled,
        pressed && variant !== "primary" ? styles.pressedGhost : null,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === "ghost" ? colors.accent : "#FFFFFF"} />
      ) : (
        <View style={styles.content}>
          {icon}
          <Text style={[styles.label, labelVariantStyles[variant]]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 56,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  label: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 16,
  },
  disabled: {
    opacity: 0.5,
  },
  pressedGhost: {
    backgroundColor: colors.surfaceMuted,
  },
});

const variantStyles = StyleSheet.create({
  primary: { backgroundColor: colors.accent },
  secondary: { backgroundColor: colors.primary },
  ghost: { backgroundColor: "transparent", borderWidth: 1, borderColor: colors.border },
});

const labelVariantStyles = StyleSheet.create({
  primary: { color: "#FFFFFF" },
  secondary: { color: "#FFFFFF" },
  ghost: { color: colors.text },
});
