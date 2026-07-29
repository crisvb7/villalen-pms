// app/api/rooms/[id]/channex-sync/route.ts
// Sincronización manual bajo demanda: republica disponibilidad + tarifa
// de una habitación en Channex (botón "Sincronizar ahora" del admin).

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { addDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { isChannexConfigured, pushAvailabilityAndRates } from "@/lib/services/channex.service";
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
    if (!isChannexConfigured()) {
      return NextResponse.json(
        { error: "Channex no está configurado (faltan CHANNEX_API_KEY / CHANNEX_PROPERTY_ID)." },
        { status: 400 }
      );
    }

    const room = await prisma.room.findUnique({ where: { id: params.id } });
    if (!room) {
      return NextResponse.json({ error: "Habitación no encontrada." }, { status: 404 });
    }

    if (!room.channexRoomTypeId || !room.channexRatePlanId) {
      return NextResponse.json(
        { error: "Esta habitación no tiene channexRoomTypeId/channexRatePlanId configurados." },
        { status: 400 }
      );
    }

    const today = new Date();
    await pushAvailabilityAndRates(room.id, today, addDays(today, SYNC_WINDOW_DAYS), {
      throwOnError: true,
    });

    return NextResponse.json({ message: `Sincronización enviada para "${room.name}".` });
  } catch (error) {
    console.error("[POST /api/rooms/:id/channex-sync]", error);
    const msg = error instanceof Error ? error.message : "Error al sincronizar con Channex.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
