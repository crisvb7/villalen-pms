// app/(app)/rutas/_layout.tsx
import { Stack } from "expo-router";
import { colors, fonts } from "@/lib/theme";

export default function RutasLayout() {
  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.text,
        headerStyle: { backgroundColor: colors.surface },
        headerTitleStyle: { fontFamily: fonts.sansSemiBold },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="[id]" options={{ title: "", headerBackTitle: "Rutas" }} />
    </Stack>
  );
}
