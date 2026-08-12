// lib/api.ts
// Cliente para el backend de villalen-pms (app/api/*). Las mismas rutas que
// usa la web; requireAuth() en el backend acepta tanto la cookie de NextAuth
// como el "Authorization: Bearer <token>" que mandamos aquí.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "@/lib/config";
import { getStoredToken } from "@/lib/storage";
import type {
  Booking,
  BookingStatus,
  CashMovementType,
  CashSession,
  CleaningRoom,
  Expense,
  GuestMessageItem,
  GuestServiceRequestItem,
  GuestServiceType,
  Invoice,
  MobileUser,
  PaymentMethod,
  Quote,
  QuoteStatus,
  Room,
  TodayBoardRow,
  YearStats,
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

export async function login(email: string, password: string) {
  const result = await request<{ token: string; user: MobileUser }>(
    "/api/mobile/auth/login",
    { method: "POST", body: JSON.stringify({ email, password }) }
  );
  // Precarga la caché de fetchMe() para que un reinicio sin red, justo
  // después de iniciar sesión, tenga algo que mostrar.
  await setCache("/api/mobile/auth/me", { user: result.user });
  return result;
}

export async function fetchMe() {
  return request<{ user: MobileUser }>("/api/mobile/auth/me");
}

// ── Reservas ─────────────────────────────────────────────────────────────

export async function fetchBookings(status?: BookingStatus) {
  const query = status ? `?status=${status}` : "";
  return request<{ data: Booking[] }>(`/api/bookings${query}`);
}

export async function fetchBooking(id: string) {
  return request<{ data: Booking }>(`/api/bookings/${id}`);
}

export async function updateBookingStatus(id: string, status: BookingStatus) {
  return request<{ data: Booking }>(`/api/bookings/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export interface UpdateBookingInput {
  roomId?: string;
  checkInDate?: string;
  checkOutDate?: string;
  status?: BookingStatus;
  adults?: number;
  children?: number;
  notes?: string;
  depositPaid?: boolean;
}

export async function updateBooking(id: string, input: UpdateBookingInput) {
  return request<{ data: Booking }>(`/api/bookings/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

// Genera (o regenera) el código de acceso a la app de huéspedes. Devuelve el
// código en texto plano una única vez: no se puede volver a consultar.
export async function generateGuestAccess(id: string) {
  return request<{ data: { code: string; bookingId: string } }>(
    `/api/bookings/${id}/guest-access`,
    { method: "POST" }
  );
}

export async function revokeGuestAccess(id: string) {
  return request<{ message: string }>(`/api/bookings/${id}/guest-access`, {
    method: "DELETE",
  });
}

export interface CreateBookingInput {
  roomId: string;
  checkInDate: string;
  checkOutDate: string;
  adults: number;
  children: number;
  guest: {
    firstName: string;
    lastName: string;
    documentId: string;
    email: string;
    phone?: string;
  };
}

export async function createBooking(input: CreateBookingInput) {
  return request<{ data: Booking }>("/api/bookings", {
    method: "POST",
    body: JSON.stringify({ ...input, source: "MANUAL" }),
  });
}

// ── Habitaciones ─────────────────────────────────────────────────────────

export async function fetchRooms() {
  return request<{ data: Room[] }>("/api/rooms");
}

export async function fetchCleaningStatus() {
  return request<{ data: CleaningRoom[] }>("/api/rooms/cleaning");
}

export async function setRoomClean(id: string, isClean: boolean) {
  return request<{ data: Room }>("/api/rooms/cleaning", {
    method: "PATCH",
    body: JSON.stringify({ id, isClean }),
  });
}

// ── Caja ─────────────────────────────────────────────────────────────────

export async function fetchOpenCashSession() {
  return request<{ data: CashSession | null }>("/api/cash-sessions?open=true");
}

export async function fetchCashSessions() {
  return request<{ data: CashSession[] }>("/api/cash-sessions");
}

export async function openCashSession(openingBalance: number, notes?: string) {
  return request<{ data: CashSession }>("/api/cash-sessions", {
    method: "POST",
    body: JSON.stringify({ openingBalance, notes }),
  });
}

export async function addCashMovement(
  sessionId: string,
  input: { type: CashMovementType; concept: string; amount: number }
) {
  return request<{ data: CashSession["movements"][number] }>(
    `/api/cash-sessions/${sessionId}/movements`,
    { method: "POST", body: JSON.stringify(input) }
  );
}

export async function closeCashSession(sessionId: string, closingBalance: number) {
  return request<{ data: CashSession }>(`/api/cash-sessions/${sessionId}/close`, {
    method: "POST",
    body: JSON.stringify({ closingBalance }),
  });
}

// ── Huéspedes ────────────────────────────────────────────────────────────

export async function fetchGuests() {
  return request<{ data: Booking["guest"][] }>("/api/guests");
}

// ── Gastos ───────────────────────────────────────────────────────────────

export async function fetchExpenses() {
  return request<{ data: Expense[] }>("/api/expenses");
}

export async function createExpense(input: {
  date: string;
  category: string;
  description: string;
  amount: number;
  paymentMethod?: PaymentMethod;
  supplier?: string;
  notes?: string;
}) {
  return request<{ data: Expense }>("/api/expenses", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function deleteExpense(id: string) {
  return request<{ message: string }>(`/api/expenses/${id}`, { method: "DELETE" });
}

// ── Presupuestos ─────────────────────────────────────────────────────────

export async function fetchQuotes() {
  return request<{ data: Quote[] }>("/api/quotes");
}

export async function fetchQuote(id: string) {
  return request<{ data: Quote }>(`/api/quotes/${id}`);
}

export async function updateQuoteStatus(id: string, status: QuoteStatus) {
  return request<{ data: Quote }>(`/api/quotes/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

// ── Facturas ─────────────────────────────────────────────────────────────

export async function fetchInvoices() {
  return request<{ data: Invoice[] }>("/api/invoices");
}

export async function fetchInvoice(id: string) {
  return request<{ data: Invoice }>(`/api/invoices/${id}`);
}

export async function markInvoicePaid(id: string, paymentMethod?: PaymentMethod) {
  return request<{ data: Invoice }>(`/api/invoices/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ isPaid: true, paymentMethod }),
  });
}

// ── Estadísticas ─────────────────────────────────────────────────────────

export async function fetchStats(year: number) {
  return request<{ data: YearStats }>(`/api/stats?year=${year}`);
}

// ── App de huéspedes (servicios diarios y chat, vistos por el personal) ───

export async function fetchBookingServices(bookingId: string) {
  return request<{ data: GuestServiceRequestItem[] }>(`/api/bookings/${bookingId}/services`);
}

export async function setBookingService(
  bookingId: string,
  date: string,
  type: GuestServiceType,
  requested: boolean
) {
  return request<{ data: GuestServiceRequestItem }>(`/api/bookings/${bookingId}/services`, {
    method: "POST",
    body: JSON.stringify({ date, type, requested }),
  });
}

export async function fetchBookingMessages(bookingId: string) {
  return request<{ data: GuestMessageItem[] }>(`/api/bookings/${bookingId}/messages`);
}

export async function sendBookingMessage(bookingId: string, body: string) {
  return request<{ data: GuestMessageItem }>(`/api/bookings/${bookingId}/messages`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
}

export async function fetchTodayServicesBoard(date: string) {
  return request<{ data: TodayBoardRow[] }>(`/api/services/today?date=${date}`);
}

export async function fetchUnreadCounts() {
  return request<{ data: Record<string, number> }>("/api/bookings/unread-counts");
}

// ── Ajustes del hotel ──────────────────────────────────────────────────────

export interface HotelSettings {
  id: string;
  dinnerServiceEnabled: boolean;
  updatedAt: string;
}

export async function fetchHotelSettings() {
  return request<{ data: HotelSettings }>("/api/settings");
}

export async function setDinnerServiceEnabled(enabled: boolean) {
  return request<{ data: HotelSettings }>("/api/settings", {
    method: "PATCH",
    body: JSON.stringify({ dinnerServiceEnabled: enabled }),
  });
}
