import type { ReactNode } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts } from "@/lib/theme";

export function ScreenHeader({
  eyebrow,
  title,
  right,
  showBack,
}: {
  eyebrow: string;
  title: string;
  right?: ReactNode;
  showBack?: boolean;
}) {
  return (
    <View>
      {showBack ? (
        <Pressable
          style={({ pressed }) => [styles.back, pressed && styles.backPressed]}
          onPress={() => router.back()}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
      ) : null}
      <View style={styles.row}>
        <View>
          <Text style={styles.eyebrow}>{eyebrow}</Text>
          <Text style={styles.title}>{title}</Text>
        </View>
        {right}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    marginBottom: 14,
    ...Platform.select({
      ios: {
        shadowColor: "#1F2421",
        shadowOpacity: 0.1,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
      },
      android: { elevation: 2 },
    }),
  },
  backPressed: {
    opacity: 0.6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: colors.textMuted,
    marginBottom: 2,
  },
  title: {
    fontFamily: fonts.serifBold,
    fontSize: 28,
    color: colors.text,
  },
});
