// app/(app)/rutas/_layout.tsx
// headerShown: false en todas — los botones de volver son propios (ver
// BackButton), no el header nativo, para que encajen con la tipografía y
// los heros a pantalla completa de estas pantallas.
import { Stack } from "expo-router";

export default function RutasLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="categoria/[category]" />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
