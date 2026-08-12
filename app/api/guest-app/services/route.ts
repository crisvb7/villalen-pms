// app/api/guest-app/services/route.ts
// Peticiones diarias del huésped: desayuno / cena / limpieza.
// GET  → lista todas las de la reserva (la app las agrupa por día).
// POST → marca/desmarca una, con validación de plazo en el servidor.

import { NextRequest, NextResponse } from "next/server";
import { requireGuestAuth } from "@/lib/guest-auth";
import { listServiceRequests, setServiceRequest } from "@/lib/services/guest-service-request.service";
import { GuestServiceType } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET() {
  const booking = await requireGuestAuth();
  if (!booking) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const requests = await listServiceRequests(booking.id);
  return NextResponse.json({ data: requests });
}

export async function POST(request: NextRequest) {
  const booking = await requireGuestAuth();
  if (!booking) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const { date, type, requested } = body ?? {};

  if (typeof date !== "string" || !(type in GuestServiceType) || typeof requested !== "boolean") {
    return NextResponse.json(
      { error: "Faltan campos: date (ISO), type (BREAKFAST|DINNER|CLEANING), requested (boolean)." },
      { status: 400 }
    );
  }

  try {
    const updated = await setServiceRequest(booking, type as GuestServiceType, date, requested);
    return NextResponse.json({ data: updated });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "No se pudo actualizar la petición.";
    return NextResponse.json({ error: msg }, { status: 422 });
  }
}
