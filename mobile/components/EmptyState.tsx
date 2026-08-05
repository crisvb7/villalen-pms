import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/lib/theme";

export function EmptyState({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.wrap}>
      <Ionicons name={icon} size={32} color={colors.textMuted} />
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    gap: 10,
  },
  text: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: "center",
  },
});
