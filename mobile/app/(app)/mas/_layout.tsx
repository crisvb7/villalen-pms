import { Stack } from "expo-router";
import { colors } from "@/lib/theme";

export default function MasLayout() {
  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.text,
        headerStyle: { backgroundColor: colors.surface },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="huespedes" options={{ headerShown: false }} />
      <Stack.Screen name="facturas" options={{ headerShown: false }} />
      <Stack.Screen name="gastos" options={{ headerShown: false }} />
      <Stack.Screen name="presupuestos" options={{ headerShown: false }} />
      <Stack.Screen name="estadisticas" options={{ headerShown: false }} />
    </Stack>
  );
}
