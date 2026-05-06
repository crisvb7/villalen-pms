// app/api/webhooks/channex/route.ts
// ============================================================
// WEBHOOK - Channel Manager (Channex.io)
// ============================================================
// Este endpoint recibe reservas externas desde Channex.io
// y las sincroniza con el PMS local.
//
// En producción:
// 1. Verificar la firma HMAC del webhook (X-Channex-Signature)
// 2. Responder 200 inmediatamente y procesar en background
// 3. Implementar reintentos con idempotencia (externalId)

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ChannexWebhookPayload } from "@/lib/types";
import { BookingStatus, BookingSource } from "@prisma/client";
import { parseISO, differenceInDays } from "date-fns";

// Mapeo de canales Channex → BookingSource
const CHANNEL_MAP: Record<string, BookingSource> = {
  "Booking.com": BookingSource.BOOKING,
  "Airbnb": BookingSource.AIRBNB,
  default: BookingSource.CHANNEX,
};

export async function POST(request: NextRequest) {
  try {
    // ── 1. Verificación de firma (simulada) ──────────────────────────────
    const signature = request.headers.get("x-channex-signature");
    const webhookSecret = process.env.CHANNEX_WEBHOOK_SECRET;

    if (webhookSecret && !signature) {
      console.warn("[Channex Webhook] ⚠️  Petición sin firma HMAC.");
      // En producción: return 401
      // En desarrollo: continuamos con aviso
    }

    // ── 2. Parsear payload ────────────────────────────────────────────────
    const payload: ChannexWebhookPayload = await request.json();

    console.log(`[Channex Webhook] 📨 Evento recibido: ${payload.event}`);
    console.log(`[Channex Webhook] 🔑 ID externo: ${payload.booking?.id}`);

    const { booking: extBooking } = payload;

    if (!extBooking) {
      return NextResponse.json(
        { error: "Payload sin datos de reserva." },
        { status: 400 }
      );
    }

    // ── 3. Idempotencia: verificar si ya existe ──────────────────────────
    const existingBooking = await prisma.booking.findUnique({
      where: { externalId: extBooking.id },
    });

    // ── 4. Procesar según tipo de evento ─────────────────────────────────
    switch (payload.event) {
      case "booking_created":
      case "booking_new": {
        if (existingBooking) {
          console.log(
            `[Channex Webhook] ℹ️  Reserva ya existente: ${extBooking.id}`
          );
          return NextResponse.json({
            message: "Reserva ya registrada (idempotente).",
            bookingId: existingBooking.id,
          });
        }

        // Buscar o crear el huésped
        let guest = await prisma.guest.findFirst({
          where: { email: extBooking.guest.email },
        });

        if (!guest) {
          guest = await prisma.guest.create({
            data: {
              firstName: extBooking.guest.first_name,
              lastName: extBooking.guest.last_name,
              documentId:
                extBooking.guest.document ?? `EXT-${extBooking.id}`,
              email: extBooking.guest.email,
              phone: extBooking.guest.phone,
            },
          });
        }

        // Buscar habitación por nombre (simplificado)
        // En producción: mapear IDs de Channex a IDs locales
        const roomName = extBooking.rooms[0]?.title;
        const room = await prisma.room.findFirst({
          where: { name: { contains: roomName, mode: "insensitive" } },
        });

        if (!room) {
          console.error(
            `[Channex Webhook] ❌ Habitación no encontrada: "${roomName}"`
          );
          // Crear igualmente pero logar el error
          // En producción: enviar alerta al staff
        }

        const checkIn = parseISO(extBooking.arrival_date);
        const checkOut = parseISO(extBooking.departure_date);
        const nights = differenceInDays(checkOut, checkIn);
        const pricePerNight = extBooking.rooms[0]?.rate?.price ?? 0;
        const totalAmount = pricePerNight * nights;

        const source =
          CHANNEL_MAP[extBooking.channel?.title] ?? BookingSource.CHANNEX;

        // Si no encontramos habitación, usar la primera disponible (fallback)
        const targetRoom =
          room ??
          (await prisma.room.findFirst({ orderBy: { createdAt: "asc" } }));

        if (!targetRoom) {
          throw new Error("No hay habitaciones configuradas en el sistema.");
        }

        const newBooking = await prisma.booking.create({
          data: {
            guestId: guest.id,
            roomId: targetRoom.id,
            checkInDate: checkIn,
            checkOutDate: checkOut,
            totalAmount,
            status: BookingStatus.CONFIRMED,
            source,
            depositPaid: false,
            adults: extBooking.rooms[0]?.occupancy?.adults ?? 1,
            children: extBooking.rooms[0]?.occupancy?.children ?? 0,
            externalId: extBooking.id,
            channelRef: extBooking.channel?.title,
            notes: extBooking.notes,
          },
        });

        console.log(
          `[Channex Webhook] ✅ Reserva creada: ${newBooking.id} (externo: ${extBooking.id})`
        );

        return NextResponse.json(
          {
            message: "Reserva creada correctamente.",
            bookingId: newBooking.id,
          },
          { status: 201 }
        );
      }

      case "booking_cancelled":
      case "booking_cancel": {
        if (!existingBooking) {
          return NextResponse.json(
            { error: "Reserva externa no encontrada." },
            { status: 404 }
          );
        }

        await prisma.booking.update({
          where: { id: existingBooking.id },
          data: { status: BookingStatus.CANCELLED },
        });

        console.log(
          `[Channex Webhook] 🚫 Reserva cancelada: ${existingBooking.id}`
        );

        return NextResponse.json({
          message: "Reserva cancelada correctamente.",
        });
      }

      case "booking_modified":
      case "booking_update": {
        if (!existingBooking) {
          // Si no existe, crearla (booking_update puede llegar antes de booking_created)
          console.warn(
            `[Channex Webhook] ⚠️  Actualización de reserva no existente: ${extBooking.id}`
          );
          return NextResponse.json(
            { error: "Reserva no encontrada para actualizar." },
            { status: 404 }
          );
        }

        const checkIn = parseISO(extBooking.arrival_date);
        const checkOut = parseISO(extBooking.departure_date);

        await prisma.booking.update({
          where: { id: existingBooking.id },
          data: {
            checkInDate: checkIn,
            checkOutDate: checkOut,
            notes: extBooking.notes ?? existingBooking.notes,
          },
        });

        console.log(
          `[Channex Webhook] 🔄 Reserva actualizada: ${existingBooking.id}`
        );

        return NextResponse.json({
          message: "Reserva actualizada correctamente.",
        });
      }

      default:
        console.log(
          `[Channex Webhook] ℹ️  Evento no procesado: ${payload.event}`
        );
        return NextResponse.json({
          message: `Evento '${payload.event}' recibido pero no procesado.`,
        });
    }
  } catch (error) {
    console.error("[Channex Webhook] ❌ Error:", error);
    return NextResponse.json(
      { error: "Error interno al procesar el webhook." },
      { status: 500 }
    );
  }
}

// GET para verificación de endpoint (healthcheck)
export async function GET() {
  return NextResponse.json({
    status: "ok",
    endpoint: "Channex Channel Manager Webhook",
    version: "1.0",
    events: [
      "booking_created",
      "booking_cancelled",
      "booking_modified",
    ],
  });
}
