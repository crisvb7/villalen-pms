// app/api/bookings/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import {
  getBookingById,
  updateBooking,
  cancelBooking,
  deleteBooking,
} from "@/lib/services/booking.service";
import { BookingStatus } from "@prisma/client";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const booking = await getBookingById(params.id);
    if (!booking) {
      return NextResponse.json(
        { error: "Reserva no encontrada." },
        { status: 404 }
      );
    }
    return NextResponse.json({ data: booking });
  } catch (error) {
    console.error("[GET /api/bookings/:id]", error);
    return NextResponse.json(
      { error: "Error al obtener la reserva." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const updated = await updateBooking(params.id, {
      status: body.status as BookingStatus | undefined,
      depositPaid: body.depositPaid,
      notes: body.notes,
      adults: body.adults ? Number(body.adults) : undefined,
      children: body.children !== undefined ? Number(body.children) : undefined,
      checkInDate: body.checkInDate ? new Date(body.checkInDate) : undefined,
      checkOutDate: body.checkOutDate
        ? new Date(body.checkOutDate)
        : undefined,
    });
    return NextResponse.json({ data: updated });
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : "Error al actualizar la reserva.";
    return NextResponse.json({ error: msg }, { status: 422 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await deleteBooking(params.id);
    return NextResponse.json({ message: "Reserva eliminada correctamente." });
  } catch (error) {
    console.error("[DELETE /api/bookings/:id]", error);
    return NextResponse.json(
      { error: "Error al eliminar la reserva." },
      { status: 500 }
    );
  }
}
