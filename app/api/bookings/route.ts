// app/api/bookings/route.ts
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import {
  getAllBookings,
  createBooking,
} from "@/lib/services/booking.service";
import { BookingStatus } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as BookingStatus | null;

    const bookings = await getAllBookings({
      status: status ?? undefined,
    });

    return NextResponse.json({ data: bookings });
  } catch (error) {
    console.error("[GET /api/bookings]", error);
    return NextResponse.json(
      { error: "Error al obtener reservas." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validaciones básicas
    if (!body.roomId || !body.checkInDate || !body.checkOutDate || !body.guest) {
      return NextResponse.json(
        {
          error:
            "Faltan campos obligatorios: roomId, checkInDate, checkOutDate, guest.",
        },
        { status: 400 }
      );
    }

    if (
      !body.guest.firstName ||
      !body.guest.lastName ||
      !body.guest.documentId ||
      !body.guest.email
    ) {
      return NextResponse.json(
        {
          error:
            "Los datos del huésped son incompletos: nombre, apellidos, documento y email son obligatorios.",
        },
        { status: 400 }
      );
    }

    const booking = await createBooking({
      roomId: body.roomId,
      checkInDate: body.checkInDate,
      checkOutDate: body.checkOutDate,
      adults: body.adults ?? 1,
      children: body.children ?? 0,
      notes: body.notes,
      source: body.source,
      guest: {
        firstName: body.guest.firstName,
        lastName: body.guest.lastName,
        documentId: body.guest.documentId,
        email: body.guest.email,
        phone: body.guest.phone,
        nationality: body.guest.nationality,
      },
    });

    return NextResponse.json({ data: booking }, { status: 201 });
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : "Error al crear la reserva.";
    console.error("[POST /api/bookings]", error);
    return NextResponse.json({ error: msg }, { status: 422 });
  }
}
