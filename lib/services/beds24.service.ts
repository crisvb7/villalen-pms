// lib/services/beds24.service.ts
// Cliente del Channel Manager (Beds24) — sentido SALIENTE (PMS → Beds24).
//
// El sentido entrante (Beds24 → PMS) vive en app/api/webhooks/beds24/route.ts.
// Este servicio empuja disponibilidad + tarifa cuando cambia una reserva o un
// precio, para que Beds24 las distribuya a Booking.com, Airbnb, etc.
//
// ⚠️ A diferencia de channex.service.ts (que sí se verificó a mano contra un
// sandbox real), esta implementación está construida a partir de la
// documentación pública de api.beds24.com/v2 (autenticación por
// invite-code → refresh token → access token, y el endpoint de calendario),
// pero NO se ha probado todavía contra una cuenta Beds24 real. Antes de
// activarla en producción: crea la cuenta, genera el invite code
// (Settings → Account → Access) y valida el payload exacto de
// /inventory/rooms/calendar contra su Swagger (api.beds24.com/v2) con datos
// de prueba.
//
// Auth (ver wiki.beds24.com, API V2):
//   1. Invite code (se genera una vez en el panel de Beds24, caduca en 24h)
//      → GET /authentication/setup con header "code" → refreshToken (no caduca
//      mientras se use al menos cada 30 días).
//   2. GET /authentication/token con header "refreshToken" → access token de
//      corta duración (24h), se manda como header "token" en cada llamada.
// El refreshToken se obtiene UNA VEZ a mano (no lo genera este código) y se
// guarda como BEDS24_REFRESH_TOKEN.

import { prisma } from "@/lib/prisma";
import { BookingStatus } from "@prisma/client";
import { addDays, differenceInCalendarDays, format, startOfDay } from "date-fns";

const BEDS24_API_BASE = "https://api.beds24.com/v2";

function getConfig() {
  const refreshToken = process.env.BEDS24_REFRESH_TOKEN;
  const propertyId = process.env.BEDS24_PROPERTY_ID;
  if (!refreshToken || !propertyId) return null;
  return { refreshToken, propertyId };
}

export function isBeds24Configured(): boolean {
  return getConfig() !== null;
}

// Cache en memoria del access token dentro del mismo proceso (útil en
// invocaciones "warm" de la función serverless; en una invocación fría
// simplemente se vuelve a pedir). Nunca se persiste en BD.
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(refreshToken: string): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }

  const res = await fetch(`${BEDS24_API_BASE}/authentication/token`, {
    headers: { accept: "application/json", refreshToken },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Beds24 authentication/token ${res.status}: ${text}`);
  }

  const data = (await res.json()) as { token: string; expiresIn: number };
  // Restamos un margen de 60s para no usar un token a punto de caducar.
  cachedToken = { token: data.token, expiresAt: Date.now() + (data.expiresIn - 60) * 1000 };
  return data.token;
}

async function beds24Post(path: string, body: unknown, refreshToken: string): Promise<void> {
  const token = await getAccessToken(refreshToken);
  const res = await fetch(`${BEDS24_API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      accept: "application/json",
      token,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Beds24 ${path} ${res.status}: ${text}`);
  }
}

interface AvailabilitySegment {
  from: Date;
  to: Date; // exclusivo
  available: boolean;
}

/** Convierte el array día-a-día en tramos contiguos (menos llamadas que un día suelto por petición). */
function toSegments(days: boolean[], rangeStart: Date): AvailabilitySegment[] {
  const segments: AvailabilitySegment[] = [];
  let i = 0;
  while (i < days.length) {
    const start = i;
    const value = days[i];
    while (i < days.length && days[i] === value) i++;
    segments.push({
      from: addDays(rangeStart, start),
      to: addDays(rangeStart, i), // exclusivo
      available: value,
    });
  }
  return segments;
}

/**
 * Recalcula disponibilidad y tarifa para una habitación en el rango [from, to)
 * y las empuja a Beds24. Best-effort: nunca lanza — cualquier fallo (o falta
 * de configuración/mapeo) se loguea y se ignora, para no romper la operación
 * de reserva que disparó la sincronización.
 */
export async function pushAvailabilityAndRates(
  roomId: string,
  from: Date,
  to: Date,
  options?: { throwOnError?: boolean }
): Promise<void> {
  const config = getConfig();
  if (!config) {
    console.log("[Beds24] No configurado (faltan BEDS24_REFRESH_TOKEN/BEDS24_PROPERTY_ID). Sync omitido.");
    return;
  }

  try {
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) return;

    if (!room.beds24RoomId) {
      console.log(`[Beds24] Habitación "${room.name}" sin mapeo de canal (beds24RoomId). Sync omitido.`);
      return;
    }

    const rangeStart = startOfDay(from);
    const rangeEnd = startOfDay(to);
    const nights = Math.max(differenceInCalendarDays(rangeEnd, rangeStart), 0);
    if (nights === 0) return;

    const overlapping = await prisma.booking.findMany({
      where: {
        roomId,
        status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN] },
        AND: [{ checkInDate: { lt: rangeEnd } }, { checkOutDate: { gt: rangeStart } }],
      },
      select: { checkInDate: true, checkOutDate: true },
    });

    const days: boolean[] = [];
    for (let i = 0; i < nights; i++) {
      const day = addDays(rangeStart, i);
      const dayEnd = addDays(day, 1);
      const isBooked = overlapping.some((b) => b.checkInDate < dayEnd && b.checkOutDate > day);
      days.push(!isBooked); // true = disponible
    }

    const segments = toSegments(days, rangeStart);
    const rate = parseFloat(room.basePrice.toString()).toFixed(2);

    // POST /inventory/rooms/calendar acepta un array de tramos, cada uno con
    // su propio roomId + rango de fechas + campos a fijar. numAvail 0/1 hace
    // de "cerrar/abrir" (una sola unidad física por Room de este PMS);
    // price1 es la tarifa base (Beds24 admite price1..price8 para tarifas
    // distintas por canal/plan si hiciera falta más adelante).
    await beds24Post(
      "/inventory/rooms/calendar",
      segments.map((s) => ({
        roomId: room.beds24RoomId,
        from: format(s.from, "yyyy-MM-dd"),
        to: format(addDays(s.to, -1), "yyyy-MM-dd"), // "to" es inclusivo
        numAvail: s.available ? 1 : 0,
        price1: rate,
      })),
      config.refreshToken
    );

    console.log(`[Beds24] Sincronizados ${nights} día(s) para "${room.name}" (${segments.length} tramo(s)).`);
  } catch (error) {
    console.error("[Beds24] Error al sincronizar disponibilidad/tarifa:", error);
    if (options?.throwOnError) throw error;
  }
}

/**
 * Verifica que el refresh token funciona, pidiendo un access token nuevo.
 */
export async function testConnection(): Promise<{ ok: boolean; message: string }> {
  const config = getConfig();
  if (!config) {
    return { ok: false, message: "Faltan BEDS24_REFRESH_TOKEN / BEDS24_PROPERTY_ID en el entorno." };
  }

  try {
    cachedToken = null; // forzamos a pedir uno nuevo para probar el refresh token de verdad
    await getAccessToken(config.refreshToken);
    return { ok: true, message: "Conexión con Beds24 correcta." };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Error desconocido.";
    return { ok: false, message: `No se pudo conectar con Beds24: ${msg}` };
  }
}
