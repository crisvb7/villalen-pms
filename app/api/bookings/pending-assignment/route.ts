// app/api/bookings/pending-assignment/route.ts
// Reservas web sin habitación concreta asignada — usado por el aviso del
// backoffice (ver AdminLayout) para saber a cuántas hay que atender.
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { getPendingRoomAssignmentBookings } from "@/lib/services/booking.service";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const bookings = await getPendingRoomAssignmentBookings();
    return NextResponse.json({ data: bookings });
  } catch (error) {
    console.error("[GET /api/bookings/pending-assignment]", error);
    return NextResponse.json(
      { error: "Error al obtener reservas pendientes de asignar." },
      { status: 500 }
    );
  }
}
