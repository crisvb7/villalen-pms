import { StyleSheet, Text, View } from "react-native";
import { tones, type Tone } from "@/lib/theme";

export function StatTile({ label, value, tone }: { label: string; value: number; tone: Tone }) {
  const { bg, fg } = tones[tone];
  return (
    <View style={[styles.tile, { backgroundColor: bg }]}>
      <Text style={[styles.value, { color: fg }]}>{value}</Text>
      <Text style={[styles.label, { color: fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  value: {
    fontSize: 26,
    fontWeight: "700",
  },
  label: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginTop: 4,
    opacity: 0.85,
  },
});
