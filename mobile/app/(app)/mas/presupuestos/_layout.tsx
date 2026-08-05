import { Stack } from "expo-router";
import { colors } from "@/lib/theme";

export default function PresupuestosLayout() {
  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.text,
        headerStyle: { backgroundColor: colors.surface },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="[id]" options={{ title: "Presupuesto" }} />
    </Stack>
  );
}
