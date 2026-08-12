// app/api/bookings/[id]/services/route.ts
// Vista/gestión del personal (web o app de staff) sobre las peticiones
// diarias de una reserva (desayuno/cena/limpieza) — el huésped las marca
// desde /api/guest-app/services, esto es el mismo dato visto/editado desde
// el otro lado.

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getBookingById } from "@/lib/services/booking.service";
import { listServiceRequests, setServiceRequest } from "@/lib/services/guest-service-request.service";
import { GuestServiceType } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const data = await listServiceRequests(params.id);
    return NextResponse.json({ data });
  } catch (error) {
    console.error("[GET /api/bookings/:id/services]", error);
    return NextResponse.json({ error: "Error al obtener los servicios." }, { status: 500 });
  }
}

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
    const { date, type, requested } = body as {
      date?: string;
      type?: GuestServiceType;
      requested?: boolean;
    };

    if (!date || !type || typeof requested !== "boolean") {
      return NextResponse.json(
        { error: "Faltan campos: date, type, requested." },
        { status: 400 }
      );
    }

    const booking = await getBookingById(params.id);
    if (!booking) {
      return NextResponse.json({ error: "Reserva no encontrada." }, { status: 404 });
    }

    // El personal puede marcar fuera de plazo y aunque la cena esté
    // apagada por temporada (el huésped no puede saltarse ninguna de las
    // dos cosas).
    const data = await setServiceRequest(booking, type, date, requested, {
      bypassCutoff: true,
      bypassDinnerAvailability: true,
    });
    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo guardar el servicio.";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
