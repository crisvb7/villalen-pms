// app/(app)/rutas/_layout.tsx
// headerShown: false en ambas pantallas — el botón de volver de [id] es
// propio (ver BackButton), no el header nativo, para que encaje con el
// hero a pantalla completa y la tipografía de marca.
import { Stack } from "expo-router";

export default function RutasLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
