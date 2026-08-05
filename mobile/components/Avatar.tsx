import { StyleSheet, Text, View } from "react-native";
import { colors, fonts } from "@/lib/theme";

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  return (
    <View
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Text style={[styles.text, { fontSize: size * 0.38 }]}>{initialsOf(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    backgroundColor: colors.avatarBackground,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontFamily: fonts.serifSemiBold,
    color: colors.primaryDark,
  },
});
