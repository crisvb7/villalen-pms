// components/Card.tsx

import { StyleSheet, View, type ViewProps } from "react-native";
import { colors, radii, spacing } from "@/lib/theme";

export function Card({ style, ...props }: ViewProps) {
  return <View style={[styles.card, style]} {...props} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
