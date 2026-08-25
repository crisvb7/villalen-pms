// app/api/bookings/[id]/travelers/route.ts
// Acompañantes de la reserva. Endpoint PÚBLICO (sin requireAuth), mismo
// criterio que /precheckin: el id de reserva (cuid) hace de capacidad de
// acceso — lo usa tanto el huésped desde /precheckin como el personal desde
// el detalle de la reserva en el admin.

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { listBookingTravelers, addBookingTraveler } from "@/lib/services/booking-traveler.service";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const travelers = await listBookingTravelers(params.id);
    return NextResponse.json({ data: travelers });
  } catch (error) {
    console.error("[GET /api/bookings/:id/travelers]", error);
    return NextResponse.json({ error: "Error al obtener los acompañantes." }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const traveler = await addBookingTraveler(params.id, body);
    return NextResponse.json({ data: traveler });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Error al añadir el acompañante.";
    console.error("[POST /api/bookings/:id/travelers]", error);
    return NextResponse.json({ error: msg }, { status: 422 });
  }
}
