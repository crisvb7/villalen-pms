// app/api/quotes/[id]/convert/route.ts
// Convierte un presupuesto aceptado en una reserva real.

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { convertQuoteToBooking } from "@/lib/services/quote.service";
import { requireAuth } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const body = await request.json();

    if (!body.roomId || !body.guest?.firstName || !body.guest?.lastName || !body.guest?.documentId || !body.guest?.email) {
      return NextResponse.json(
        { error: "Faltan datos: habitación y datos del huésped (nombre, apellidos, documento, email) son obligatorios." },
        { status: 400 }
      );
    }

    const booking = await convertQuoteToBooking(params.id, {
      roomId: body.roomId,
      adults: body.adults ? Number(body.adults) : 1,
      children: body.children ? Number(body.children) : 0,
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
    const msg = error instanceof Error ? error.message : "Error al convertir el presupuesto.";
    console.error("[POST /api/quotes/:id/convert]", error);
    return NextResponse.json({ error: msg }, { status: 422 });
  }
}
