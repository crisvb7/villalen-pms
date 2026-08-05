import { ActivityIndicator, Pressable, StyleSheet, Text, type PressableProps } from "react-native";
import { colors } from "@/lib/theme";

type Variant = "primary" | "danger" | "secondary";

interface Props extends Omit<PressableProps, "style"> {
  label: string;
  variant?: Variant;
  loading?: boolean;
}

export function Button({ label, variant = "primary", loading, disabled, ...rest }: Props) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      {...rest}
      disabled={isDisabled}
      style={[
        styles.base,
        variant === "primary" && styles.primary,
        variant === "danger" && styles.danger,
        variant === "secondary" && styles.secondary,
        isDisabled && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === "secondary" ? colors.primary : colors.primaryText} />
      ) : (
        <Text
          style={[
            styles.label,
            variant === "secondary" ? styles.labelSecondary : styles.labelOnColor,
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primary: {
    backgroundColor: colors.primary,
  },
  danger: {
    backgroundColor: colors.danger,
  },
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  disabled: {
    opacity: 0.6,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
  },
  labelOnColor: {
    color: colors.primaryText,
  },
  labelSecondary: {
    color: colors.text,
  },
});
