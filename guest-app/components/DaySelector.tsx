// components/DaySelector.tsx
// Selector horizontal de noches de estancia. Estancias típicas de una casa
// de aldea son cortas (pocas noches), así que un ScrollView normal basta —
// no hace falta virtualizar una lista de 2-10 elementos.

import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { formatDayNumber, formatWeekdayShort, isSameDay } from "@/lib/date";
import { colors, fonts, radii, spacing } from "@/lib/theme";

interface DaySelectorProps {
  days: Date[];
  selected: Date;
  onSelect: (day: Date) => void;
}

export function DaySelector({ days, selected, onSelect }: DaySelectorProps) {
  const today = new Date();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {days.map((day) => {
        const active = isSameDay(day, selected);
        return (
          <Pressable
            key={day.toISOString()}
            onPress={() => onSelect(day)}
            style={[styles.day, active && styles.dayActive]}
          >
            <Text style={[styles.weekday, active && styles.textActive]}>
              {formatWeekdayShort(day)}
            </Text>
            <Text style={[styles.number, active && styles.textActive]}>
              {formatDayNumber(day)}
            </Text>
            {isSameDay(day, today) && <View style={[styles.dot, active && styles.dotActive]} />}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.sm, paddingVertical: spacing.xs },
  day: {
    minWidth: 56,
    minHeight: 64,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm,
  },
  dayActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  weekday: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    color: colors.textMuted,
  },
  number: {
    fontFamily: fonts.serifSemiBold,
    fontSize: 18,
    color: colors.text,
    marginTop: 2,
  },
  textActive: { color: "#FFFFFF" },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.accent,
    marginTop: 4,
  },
  dotActive: { backgroundColor: "#FFFFFF" },
});
