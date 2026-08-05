import { StyleSheet, Text, View } from "react-native";
import { tones, type Tone } from "@/lib/theme";

export function Badge({ label, tone }: { label: string; tone: Tone }) {
  const { bg, fg } = tones[tone];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color: fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  text: {
    fontSize: 12,
    fontWeight: "700",
  },
});
