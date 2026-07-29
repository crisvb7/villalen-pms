// lib/services/channex.service.ts
// Cliente del Channel Manager (Channex.io) — sentido SALIENTE (PMS → Channex).
//
// El sentido entrante (Channex → PMS) ya existe en app/api/webhooks/channex/route.ts.
// Este servicio empuja disponibilidad + tarifa cuando cambia una reserva o un precio,
// para que Channex las distribuya a Booking.com, Airbnb, etc.
//
// NOTA: el endpoint/payload exacto de la API de Channex (CHANNEX_ARI_ENDPOINT y el
// shape del body) están implementados según su documentación pública actual.
// Verificar contra docs.channex.io / su Postman collection en cuanto haya cuenta
// y API key reales, antes de usarlo en producción.

import { prisma } from "@/lib/prisma";
import { BookingStatus } from "@prisma/client";
import { addDays, differenceInCalendarDays, format, startOfDay } from "date-fns";

const CHANNEX_API_BASE = "https://app.channex.io/api/v1";

function getConfig() {
  const apiKey = process.env.CHANNEX_API_KEY;
  const propertyId = process.env.CHANNEX_PROPERTY_ID;
  if (!apiKey || !propertyId) return null;
  return { apiKey, propertyId };
}

export function isChannexConfigured(): boolean {
  return getConfig() !== null;
}

interface AriValue {
  property_id: string;
  room_type_id: string;
  rate_plan_id: string;
  date: string; // YYYY-MM-DD
  availability: number; // 0 = cerrado, 1 = abierto (habitación única)
  rate: number;
}

async function sendAri(values: AriValue[], apiKey: string): Promise<void> {
  const res = await fetch(`${CHANNEX_API_BASE}/ari`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "user-api-key": apiKey,
    },
    body: JSON.stringify({ values }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Channex ARI ${res.status}: ${body}`);
  }
}

/**
 * Recalcula disponibilidad y tarifa día a día para una habitación en el rango
 * [from, to) y las empuja a Channex. Best-effort: nunca lanza — cualquier
 * fallo (o falta de configuración/mapeo) se loguea y se ignora, para no
 * romper la operación de reserva que disparó la sincronización.
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

    const overlapping = await prisma.booking.findMany({
      where: {
        roomId,
        status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN] },
        AND: [{ checkInDate: { lt: rangeEnd } }, { checkOutDate: { gt: rangeStart } }],
      },
      select: { checkInDate: true, checkOutDate: true },
    });

    const rate = parseFloat(room.basePrice.toString());

    const values: AriValue[] = [];
    for (let i = 0; i < nights; i++) {
      const day = addDays(rangeStart, i);
      const dayEnd = addDays(day, 1);
      const isBooked = overlapping.some(
        (b) => b.checkInDate < dayEnd && b.checkOutDate > day
      );

      values.push({
        property_id: config.propertyId,
        room_type_id: room.channexRoomTypeId,
        rate_plan_id: room.channexRatePlanId,
        date: format(day, "yyyy-MM-dd"),
        availability: isBooked ? 0 : 1,
        rate,
      });
    }

    if (values.length === 0) return;

    await sendAri(values, config.apiKey);
    console.log(`[Channex] Sincronizadas ${values.length} fecha(s) para "${room.name}".`);
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
