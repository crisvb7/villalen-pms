// lib/services/channex.service.ts
// Cliente del Channel Manager (Channex.io) — sentido SALIENTE (PMS → Channex).
//
// El sentido entrante (Channex → PMS) ya existe en app/api/webhooks/channex/route.ts.
// Este servicio empuja disponibilidad + tarifa cuando cambia una reserva o un precio,
// para que Channex las distribuya a Booking.com, Airbnb, etc.
//
// Endpoints y formato verificados a mano contra el sandbox real (docs.channex.io):
//   POST /restrictions  { values: [{ property_id, rate_plan_id, date_from, date_to, rate: "90.00" }] }
//   POST /availability  { values: [{ property_id, room_type_id, date_from, date_to, availability: 0|1 }] }
// El precio va en euros como string con 2 decimales (comprobado con GET después de
// escribir: {"rate":"90.00"}), no en céntimos.

import { prisma } from "@/lib/prisma";
import { BookingStatus } from "@prisma/client";
import { addDays, differenceInCalendarDays, format, startOfDay } from "date-fns";

// "staging" = sandbox de pruebas (staging.channex.io, sin coste);
// "production" = cuenta de pago real (app.channex.io).
const CHANNEX_API_BASE =
  process.env.CHANNEX_ENVIRONMENT === "production"
    ? "https://app.channex.io/api/v1"
    : "https://staging.channex.io/api/v1";

function getConfig() {
  const apiKey = process.env.CHANNEX_API_KEY;
  const propertyId = process.env.CHANNEX_PROPERTY_ID;
  if (!apiKey || !propertyId) return null;
  return { apiKey, propertyId };
}

export function isChannexConfigured(): boolean {
  return getConfig() !== null;
}

async function channexPost(path: string, body: unknown, apiKey: string): Promise<void> {
  const res = await fetch(`${CHANNEX_API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "user-api-key": apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Channex ${path} ${res.status}: ${text}`);
  }
}

interface AvailabilitySegment {
  from: Date;
  to: Date; // exclusivo
  available: boolean;
}

/** Convierte el array día-a-día en tramos contiguos (la API pide rangos, no días sueltos). */
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
 * y las empuja a Channex. Best-effort: nunca lanza — cualquier fallo (o falta
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
    console.log("[Channex] No configurado (faltan CHANNEX_API_KEY/CHANNEX_PROPERTY_ID). Sync omitido.");
    return;
  }

  try {
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) return;

    if (!room.channexRoomTypeId || !room.channexRatePlanId) {
      console.log(`[Channex] Habitación "${room.name}" sin mapeo de canal (channexRoomTypeId/channexRatePlanId). Sync omitido.`);
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

    await channexPost(
      "/availability",
      {
        values: segments.map((s) => ({
          property_id: config.propertyId,
          room_type_id: room.channexRoomTypeId,
          date_from: format(s.from, "yyyy-MM-dd"),
          date_to: format(addDays(s.to, -1), "yyyy-MM-dd"), // date_to es inclusivo
          availability: s.available ? 1 : 0,
        })),
      },
      config.apiKey
    );

    await channexPost(
      "/restrictions",
      {
        values: [
          {
            property_id: config.propertyId,
            rate_plan_id: room.channexRatePlanId,
            date_from: format(rangeStart, "yyyy-MM-dd"),
            date_to: format(addDays(rangeEnd, -1), "yyyy-MM-dd"),
            rate,
          },
        ],
      },
      config.apiKey
    );

    console.log(`[Channex] Sincronizados ${nights} día(s) para "${room.name}" (${segments.length} tramo(s) de disponibilidad).`);
  } catch (error) {
    console.error("[Channex] Error al sincronizar disponibilidad/tarifa:", error);
    if (options?.throwOnError) throw error;
  }
}

/**
 * Verifica que la API key funciona, consultando la propiedad configurada.
 */
export async function testConnection(): Promise<{ ok: boolean; message: string }> {
  const config = getConfig();
  if (!config) {
    return { ok: false, message: "Faltan CHANNEX_API_KEY / CHANNEX_PROPERTY_ID en el entorno." };
  }

  try {
    const res = await fetch(`${CHANNEX_API_BASE}/properties/${config.propertyId}`, {
      headers: { "user-api-key": config.apiKey },
    });

    if (!res.ok) {
      return { ok: false, message: `Channex respondió ${res.status}.` };
    }

    return { ok: true, message: "Conexión con Channex correcta." };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Error desconocido.";
    return { ok: false, message: `No se pudo conectar con Channex: ${msg}` };
  }
}
