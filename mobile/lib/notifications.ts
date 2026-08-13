// lib/notifications.ts
// Notificaciones push nativas (APNs) para el personal — pide permiso,
// obtiene el token de dispositivo de Apple y lo registra en el backend.
// No pasa por el servicio de push de Expo: el token es el device token
// nativo, y el envío real lo hace el backend directo contra APNs (ver
// lib/services/push.service.ts en el repo del servidor).

import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import * as api from "@/lib/api";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotifications(): Promise<void> {
  if (Platform.OS !== "ios") return;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") return;

  try {
    const { data: token } = await Notifications.getDevicePushTokenAsync();
    await api.registerPushToken(token);
  } catch {
    // Sin conexión o dispositivo sin capacidad de push (simulador, etc.):
    // no bloqueamos el uso de la app por esto.
  }
}
