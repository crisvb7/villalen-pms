// app/api/guest-app/services/route.ts
// Peticiones diarias del huésped: desayuno / cena / limpieza.
// GET  → lista todas las de la reserva (la app las agrupa por día).
// POST → marca/desmarca una, con validación de plazo en el servidor.

import { NextRequest, NextResponse } from "next/server";
import { requireGuestAuth } from "@/lib/guest-auth";
import { listServiceRequests, setServiceRequest } from "@/lib/services/guest-service-request.service";
import { getHotelSettings } from "@/lib/services/hotel-setting.service";
import { sendPushToStaff } from "@/lib/services/push.service";
import { prisma } from "@/lib/prisma";
import { GuestServiceType } from "@prisma/client";

const SERVICE_LABELS: Record<GuestServiceType, string> = {
  BREAKFAST: "desayuno",
  DINNER: "cena",
  CLEANING: "limpieza de habitación",
};

export const dynamic = "force-dynamic";

export async function GET() {
  const booking = await requireGuestAuth();
  if (!booking) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const [requests, settings] = await Promise.all([
    listServiceRequests(booking.id),
    getHotelSettings(),
  ]);
  return NextResponse.json({ data: requests, dinnerServiceEnabled: settings.dinnerServiceEnabled });
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

    if (requested) {
      const room = await prisma.room.findUnique({ where: { id: booking.roomId ?? "" } });
      const roomLabel = room?.name ?? "Una habitación";
      const dateLabel = new Date(date).toLocaleDateString("es-ES", {
        day: "numeric",
        month: "short",
        timeZone: "UTC",
      });
      try {
        await sendPushToStaff({
          title: `${roomLabel} pide ${SERVICE_LABELS[type as GuestServiceType]}`,
          body: `Para el ${dateLabel}.`,
          data: { bookingId: booking.id },
        });
      } catch (err) {
        // No dejamos que un fallo de notificación tumbe la petición del huésped.
        console.error("[push] Error al notificar al personal", err);
      }
    }

    return NextResponse.json({ data: updated });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "No se pudo actualizar la petición.";
    return NextResponse.json({ error: msg }, { status: 422 });
  }
}
