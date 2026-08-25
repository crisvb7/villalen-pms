// app/api/bookings/[id]/travelers/[travelerId]/route.ts
// Editar/eliminar un acompañante concreto. Público, ver route.ts del padre.

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { updateBookingTraveler, removeBookingTraveler } from "@/lib/services/booking-traveler.service";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; travelerId: string } }
) {
  try {
    const body = await request.json();
    const traveler = await updateBookingTraveler(params.id, params.travelerId, body);
    return NextResponse.json({ data: traveler });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Error al actualizar el acompañante.";
    console.error("[PATCH /api/bookings/:id/travelers/:travelerId]", error);
    return NextResponse.json({ error: msg }, { status: 422 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; travelerId: string } }
) {
  try {
    await removeBookingTraveler(params.id, params.travelerId);
    return NextResponse.json({ message: "Acompañante eliminado." });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Error al eliminar el acompañante.";
    console.error("[DELETE /api/bookings/:id/travelers/:travelerId]", error);
    return NextResponse.json({ error: msg }, { status: 422 });
  }
}
