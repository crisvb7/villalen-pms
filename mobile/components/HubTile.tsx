import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, type Href } from "expo-router";
import { colors, fonts, tones } from "@/lib/theme";

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description: string;
  href: Href;
}

export function HubTile({ icon, label, description, href }: Props) {
  return (
    <Pressable style={styles.tile} onPress={() => router.push(href)}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={20} color={colors.text} />
      </View>
      <View style={styles.textWrap}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    gap: 12,
    ...Platform.select({
      ios: {
        shadowColor: "#1F2421",
        shadowOpacity: 0.06,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
      },
      android: { elevation: 1 },
    }),
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: tones.gray.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  textWrap: {
    flex: 1,
  },
  label: {
    fontFamily: fonts.serifSemiBold,
    fontSize: 15,
    color: colors.text,
  },
  description: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
});
