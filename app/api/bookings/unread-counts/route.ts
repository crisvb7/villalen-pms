// app/api/bookings/unread-counts/route.ts
// Cuántos mensajes sin leer del huésped hay por reserva, para el badge del
// listado de reservas — una sola consulta en vez de una por fila.

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { countUnreadFromGuestsByBooking } from "@/lib/services/guest-message.service";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const data = await countUnreadFromGuestsByBooking();
    return NextResponse.json({ data });
  } catch (error) {
    console.error("[GET /api/bookings/unread-counts]", error);
    return NextResponse.json({ error: "Error al obtener mensajes sin leer." }, { status: 500 });
  }
}
