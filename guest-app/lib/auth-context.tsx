// lib/auth-context.tsx
// Estado de sesión global del huésped. Al arrancar, intenta cargar el token
// guardado y validarlo contra /api/guest-app/me; expone signInWithCode /
// submitName / signOut para las pantallas. Tres estados posibles para el
// árbol de navegación (ver app/_layout.tsx): sin token → login; token pero
// sin nombre → captura de nombre; token con nombre → app.

import { createContext, useContext, useEffect, useState, type PropsWithChildren } from "react";
import * as api from "@/lib/api";
import { clearStoredToken, getStoredToken, setStoredToken } from "@/lib/storage";
import type { GuestBooking } from "@/lib/types";

interface AuthContextValue {
  booking: GuestBooking | null;
  isLoading: boolean;
  error: string | null;
  signInWithCode: (code: string) => Promise<void>;
  submitName: (name: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [booking, setBooking] = useState<GuestBooking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const token = await getStoredToken();
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const { data } = await api.fetchMe();
        setBooking(data);
      } catch (err) {
        // Token inválido/expirado (respuesta del servidor): cerramos sesión.
        // Fallo de red (sin WiFi/datos y sin caché previa): mantenemos el
        // token para reintentar cuando vuelva la conexión.
        if (err instanceof api.ApiError) {
          await clearStoredToken();
        }
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  async function signInWithCode(code: string) {
    setError(null);
    try {
      const { data } = await api.loginWithCode(code);
      await setStoredToken(data.token);
      setBooking(data.booking);
    } catch (err) {
      setError(
        err instanceof api.ApiError || err instanceof api.OfflineError
          ? err.message
          : "No se pudo iniciar sesión."
      );
      throw err;
    }
  }

  async function submitName(name: string) {
    setError(null);
    try {
      const { data } = await api.setDisplayName(name);
      setBooking(data);
    } catch (err) {
      setError(err instanceof api.ApiError ? err.message : "No se pudo guardar el nombre.");
      throw err;
    }
  }

  async function signOut() {
    await clearStoredToken();
    setBooking(null);
  }

  return (
    <AuthContext.Provider
      value={{ booking, isLoading, error, signInWithCode, submitName, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>.");
  return ctx;
}
