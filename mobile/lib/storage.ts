// lib/storage.ts
// Guarda el token de sesión en el almacén seguro del dispositivo
// (Keychain en iOS, Keystore en Android). Ver expo-secure-store.

import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "villalen_pms_token";

export async function getStoredToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setStoredToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearStoredToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}
