// app/api/rooms/[id]/beds24-sync/route.ts
// Sincronización manual bajo demanda: republica disponibilidad + tarifa
// de una habitación en Beds24 (botón "Sincronizar ahora" del admin).

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { addDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { isBeds24Configured, pushAvailabilityAndRates } from "@/lib/services/beds24.service";
import { requireAuth } from "@/lib/auth";

const SYNC_WINDOW_DAYS = 365;

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    if (!isBeds24Configured()) {
      return NextResponse.json(
        { error: "Beds24 no está configurado (faltan BEDS24_REFRESH_TOKEN / BEDS24_PROPERTY_ID)." },
        { status: 400 }
      );
    }

    const room = await prisma.room.findUnique({ where: { id: params.id } });
    if (!room) {
      return NextResponse.json({ error: "Habitación no encontrada." }, { status: 404 });
    }

    if (!room.beds24RoomId) {
      return NextResponse.json(
        { error: "Esta habitación no tiene beds24RoomId configurado." },
        { status: 400 }
      );
    }

    const today = new Date();
    await pushAvailabilityAndRates(room.id, today, addDays(today, SYNC_WINDOW_DAYS), {
      throwOnError: true,
    });

    return NextResponse.json({ message: `Sincronización enviada para "${room.name}".` });
  } catch (error) {
    console.error("[POST /api/rooms/:id/beds24-sync]", error);
    const msg = error instanceof Error ? error.message : "Error al sincronizar con Beds24.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
