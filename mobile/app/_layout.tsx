// app/_layout.tsx
// Raíz de la navegación. Mientras se cargan las fuentes y se resuelve la
// sesión (token guardado → /api/mobile/auth/me) se muestra un loader;
// después, Stack.Protected decide entre el grupo (app) autenticado y la
// pantalla de login.

import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as Notifications from "expo-notifications";
import {
  useFonts,
  PlayfairDisplay_500Medium,
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_700Bold,
} from "@expo-google-fonts/playfair-display";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { registerForPushNotifications } from "@/lib/notifications";
import { colors } from "@/lib/theme";

function RootNavigator() {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (user) registerForPushNotifications();
  }, [user]);

  useEffect(() => {
    // El backend manda { data: { bookingId } } en el payload de la
    // notificación (ver lib/services/push.service.ts en el servidor).
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const bookingId = response.notification.request.content.data?.bookingId;
      if (typeof bookingId === "string") {
        router.push(`/reservas/${bookingId}`);
      }
    });
    return () => sub.remove();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!!user}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!user}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PlayfairDisplay_500Medium,
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
});
