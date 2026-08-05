import { Platform, Pressable, StyleSheet, View, type ViewProps } from "react-native";
import { colors } from "@/lib/theme";

interface Props extends ViewProps {
  onPress?: () => void;
}

export function Card({ style, onPress, children, ...rest }: Props) {
  if (onPress) {
    return (
      <Pressable style={[styles.card, style]} onPress={onPress}>
        {children}
      </Pressable>
    );
  }
  return (
    <View style={[styles.card, style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
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
});
