// lib/api.ts
// Cliente para /api/guest-app/* (ver app/api/guest-app en villalen-pms). Sin
// registro: el huésped entra con el código que le da el personal y a partir
// de ahí todo va con "Authorization: Bearer <token>" (ver lib/storage.ts).

import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "@/lib/config";
import { getStoredToken } from "@/lib/storage";
import type {
  GuestBooking,
  GuestMessage,
  GuestRoute,
  GuestServiceRequest,
  GuestServiceType,
} from "@/lib/types";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// Sin conexión y sin nada guardado en caché para esta ruta.
export class OfflineError extends Error {
  constructor() {
    super("Sin conexión a internet.");
  }
}

// Caché local de las últimas respuestas GET, para poder mostrar algo cuando
// no hay red (ver request() más abajo).
function cacheKey(path: string) {
  return `cache:${path}`;
}

async function setCache(path: string, body: unknown) {
  try {
    await AsyncStorage.setItem(cacheKey(path), JSON.stringify(body));
  } catch {
    // si falla el guardado en caché no bloqueamos la petición real
  }
}

async function getCache<T>(path: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(cacheKey(path));
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getStoredToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const method = (options.method ?? "GET").toUpperCase();
  const isRead = method === "GET";

  let res: Response;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      res = await fetch(`${API_URL}${path}`, {
        ...options,
        headers,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
  } catch {
    // Fallo de red (no hay respuesta del servidor). Para lecturas, devolvemos
    // lo último que se cargó con éxito; para escrituras no hay nada que hacer
    // offline.
    if (isRead) {
      const cached = await getCache<T>(path);
      if (cached) return cached;
    }
    throw new OfflineError();
  }

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    // respuesta sin cuerpo JSON (p.ej. 204)
  }

  if (!res.ok) {
    const message =
      (body as { error?: string } | null)?.error ?? `Error ${res.status}`;
    throw new ApiError(message, res.status);
  }

  if (isRead) {
    setCache(path, body);
  }

  return body as T;
}

// ── Auth ─────────────────────────────────────────────────────────────────

export async function loginWithCode(code: string) {
  const result = await request<{ data: { token: string; booking: GuestBooking } }>(
    "/api/guest-app/auth/login",
    { method: "POST", body: JSON.stringify({ code }) }
  );
  // Precarga la caché de fetchMe() para que un reinicio sin red, justo
  // después de iniciar sesión, tenga algo que mostrar.
  await setCache("/api/guest-app/me", { data: result.data.booking });
  return result;
}

export async function setDisplayName(name: string) {
  return request<{ data: GuestBooking }>("/api/guest-app/auth/name", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export async function fetchMe() {
  return request<{ data: GuestBooking }>("/api/guest-app/me");
}

// ── Servicios diarios ────────────────────────────────────────────────────

export async function fetchServiceRequests() {
  return request<{ data: GuestServiceRequest[]; dinnerServiceEnabled: boolean }>(
    "/api/guest-app/services"
  );
}

export async function setServiceRequest(
  date: string,
  type: GuestServiceType,
  requested: boolean
) {
  return request<{ data: GuestServiceRequest }>("/api/guest-app/services", {
    method: "POST",
    body: JSON.stringify({ date, type, requested }),
  });
}

// ── Chat con recepción ───────────────────────────────────────────────────

export async function fetchMessages() {
  return request<{ data: GuestMessage[] }>("/api/guest-app/messages");
}

export async function sendMessage(body: string, replyToId?: string | null) {
  return request<{ data: GuestMessage }>("/api/guest-app/messages", {
    method: "POST",
    body: JSON.stringify({ body, replyToId: replyToId ?? undefined }),
  });
}

export async function fetchUnreadCount() {
  return request<{ data: { count: number } }>("/api/guest-app/messages/unread-count");
}

// ── Guía de rutas ────────────────────────────────────────────────────────

export async function fetchRoutes() {
  return request<{ data: GuestRoute[] }>("/api/guest-app/routes");
}

export async function fetchRoute(id: string) {
  return request<{ data: GuestRoute }>(`/api/guest-app/routes/${id}`);
}
