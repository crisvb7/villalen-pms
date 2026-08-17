// app/api/webhooks/beds24/route.ts
// ============================================================
// WEBHOOK - Channel Manager (Beds24)
// ============================================================
//
// ⚠️ IMPORTANTE ANTES DE ACTIVAR EN PRODUCCIÓN: los nombres de campo de abajo
// (bookId, roomId, arrival, departure, firstName...) están tomados de la
// documentación pública de la API v2 de Beds24, pero este endpoint NO se ha
// probado todavía contra un envío real. Beds24 permite mandar un webhook de
// prueba desde Settings → Properties → Access → Booking webhooks: haz eso
// primero, mira el log (`[Beds24 Webhook] payload crudo`) y ajusta
// `parseBeds24Booking` si algún nombre no coincide.

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { BookingStatus, BookingSource } from "@prisma/client";
import { parseISO } from "date-fns";

// Mapeo de canal (campo "referer"/"channel" de Beds24) → BookingSource
const CHANNEL_MAP: Record<string, BookingSource> = {
  "booking.com": BookingSource.BOOKING,
  "airbnb": BookingSource.AIRBNB,
};

function mapChannel(referer?: string | null): BookingSource {
  if (!referer) return BookingSource.BEDS24;
  const key = referer.toLowerCase();
  const match = Object.entries(CHANNEL_MAP).find(([k]) => key.includes(k));
  return match ? match[1] : BookingSource.BEDS24;
}

interface Beds24BookingPayload {
  bookId?: string | number;
  id?: string | number;
  roomId?: string | number;
  status?: string; // "confirmed" | "new" | "cancelled" | "request" | "black"
  arrival?: string;
  departure?: string;
  numAdult?: number;
  numChild?: number;
  price?: number | string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  referer?: string; // canal de origen, p.ej. "Booking.com"
  apiReference?: string;
  comments?: string;
}

const CANCELLED_STATUSES = new Set(["cancelled", "canceled", "black"]);

async function handleBooking(extBooking: Beds24BookingPayload) {
  const externalId = String(extBooking.bookId ?? extBooking.id ?? "");
  if (!externalId) {
    return NextResponse.json({ error: "Reserva sin identificador (bookId)." }, { status: 400 });
  }

  const existingBooking = await prisma.booking.findUnique({ where: { externalId } });
  const isCancelled = extBooking.status ? CANCELLED_STATUSES.has(extBooking.status.toLowerCase()) : false;

  // ── Cancelación ──────────────────────────────────────────────────────
  if (isCancelled) {
    if (!existingBooking) {
      console.log(`[Beds24 Webhook] ℹ️ Cancelación de reserva no registrada localmente: ${externalId}`);
      return NextResponse.json({ message: "Reserva no encontrada localmente, nada que cancelar." });
    }
    await prisma.booking.update({
      where: { id: existingBooking.id },
      data: { status: BookingStatus.CANCELLED },
    });
    console.log(`[Beds24 Webhook] 🚫 Reserva cancelada: ${existingBooking.id}`);
    return NextResponse.json({ message: "Reserva cancelada correctamente." });
  }

  // ── Alta o actualización ────────────────────────────────────────────
  if (!extBooking.arrival || !extBooking.departure) {
    return NextResponse.json({ error: "Payload sin fechas de entrada/salida." }, { status: 400 });
  }

  const checkIn = parseISO(extBooking.arrival);
  const checkOut = parseISO(extBooking.departure);
  const source = mapChannel(extBooking.referer);

  if (existingBooking) {
    await prisma.booking.update({
      where: { id: existingBooking.id },
      data: {
        checkInDate: checkIn,
        checkOutDate: checkOut,
        notes: extBooking.comments ?? existingBooking.notes,
      },
    });
    console.log(`[Beds24 Webhook] 🔄 Reserva actualizada: ${existingBooking.id}`);
    return NextResponse.json({ message: "Reserva actualizada correctamente.", bookingId: existingBooking.id });
  }

  let guest = extBooking.email
    ? await prisma.guest.findFirst({ where: { email: extBooking.email } })
    : null;

  if (!guest) {
    guest = await prisma.guest.create({
      data: {
        firstName: extBooking.firstName ?? "Huésped",
        lastName: extBooking.lastName ?? "Beds24",
        documentId: `EXT-${externalId}`,
        email: extBooking.email ?? `${externalId}@sin-email.beds24`,
        phone: extBooking.phone,
      },
    });
  }

  // Habitación por beds24RoomId (mapeo explícito, no por nombre — a
  // diferencia del webhook de Channex que buscaba por título de habitación).
  const room = extBooking.roomId
    ? await prisma.room.findFirst({ where: { beds24RoomId: String(extBooking.roomId) } })
    : null;

  if (!room) {
    console.error(`[Beds24 Webhook] ❌ Sin habitación mapeada para beds24RoomId="${extBooking.roomId}".`);
  }

  const targetRoom = room ?? (await prisma.room.findFirst({ orderBy: { createdAt: "asc" } }));
  if (!targetRoom) {
    throw new Error("No hay habitaciones configuradas en el sistema.");
  }

  const totalAmount = Number(extBooking.price ?? 0);

  const newBooking = await prisma.booking.create({
    data: {
      guestId: guest.id,
      roomId: targetRoom.id,
      roomType: targetRoom.type,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      totalAmount,
      status: BookingStatus.CONFIRMED,
      source,
      depositPaid: false,
      adults: extBooking.numAdult ?? 1,
      children: extBooking.numChild ?? 0,
      externalId,
      channelRef: extBooking.referer,
      notes: extBooking.comments,
    },
  });

  console.log(`[Beds24 Webhook] ✅ Reserva creada: ${newBooking.id} (externo: ${externalId})`);
  return NextResponse.json({ message: "Reserva creada correctamente.", bookingId: newBooking.id }, { status: 201 });
}

export async function POST(request: NextRequest) {
  try {
    // Beds24 no firma sus webhooks con HMAC (a diferencia de Channex); en su
    // lugar, el secreto se incrusta en la propia URL registrada en su panel
    // (?secret=...). Configura ahí: https://tu-dominio.com/api/webhooks/beds24?secret=TU_SECRETO
    const webhookSecret = process.env.BEDS24_WEBHOOK_SECRET;
    if (webhookSecret) {
      const provided = request.nextUrl.searchParams.get("secret");
      if (provided !== webhookSecret) {
        console.warn("[Beds24 Webhook] ⚠️ Petición sin secreto válido en la URL.");
        return NextResponse.json({ error: "No autorizado." }, { status: 401 });
      }
    }

    const payload = await request.json();
    console.log("[Beds24 Webhook] 📨 Payload crudo:", JSON.stringify(payload));

    // Beds24 puede mandar un único objeto o un array de reservas en el mismo
    // envío (p.ej. una modificación que afecta a varias noches/reservas
    // vinculadas) — soportamos ambos.
    const bookings: Beds24BookingPayload[] = Array.isArray(payload) ? payload : [payload];
    if (bookings.length === 0) {
      return NextResponse.json({ error: "Payload sin reservas." }, { status: 400 });
    }

    const results = [];
    for (const booking of bookings) {
      results.push(await handleBooking(booking));
    }

    // Si solo había una reserva, devolvemos su respuesta tal cual (compatibilidad).
    return bookings.length === 1 ? results[0] : NextResponse.json({ message: `${results.length} reserva(s) procesadas.` });
  } catch (error) {
    console.error("[Beds24 Webhook] ❌ Error:", error);
    return NextResponse.json({ error: "Error interno al procesar el webhook." }, { status: 500 });
  }
}

// GET para verificación de endpoint (healthcheck)
export async function GET() {
  return NextResponse.json({
    status: "ok",
    endpoint: "Beds24 Channel Manager Webhook",
    version: "1.0",
    events: ["booking created/updated (status confirmed|new|request)", "booking cancelled (status cancelled|black)"],
  });
}
