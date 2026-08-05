// lib/auth-context.tsx
// Estado de sesión global. Al arrancar, intenta cargar el token guardado y
// valida contra /api/mobile/auth/me; expone signIn/signOut para las pantallas.

import { createContext, useContext, useEffect, useState, type PropsWithChildren } from "react";
import * as api from "@/lib/api";
import { clearStoredToken, getStoredToken, setStoredToken } from "@/lib/storage";
import type { MobileUser } from "@/lib/types";

interface AuthContextValue {
  user: MobileUser | null;
  isLoading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<MobileUser | null>(null);
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
        const { user } = await api.fetchMe();
        setUser(user);
      } catch {
        await clearStoredToken();
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  async function signIn(email: string, password: string) {
    setError(null);
    try {
      const { token, user } = await api.login(email, password);
      await setStoredToken(token);
      setUser(user);
    } catch (err) {
      setError(err instanceof api.ApiError ? err.message : "No se pudo iniciar sesión.");
      throw err;
    }
  }

  async function signOut() {
    await clearStoredToken();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, error, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>.");
  return ctx;
}
