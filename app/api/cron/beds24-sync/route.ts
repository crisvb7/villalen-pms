// app/api/cron/beds24-sync/route.ts
// Red de seguridad: republica disponibilidad + tarifa de todas las
// habitaciones mapeadas a Beds24, por si alguna sincronización puntual
// falló silenciosamente. Pensado para ejecutarse una vez al día (ver
// "crons" en vercel.json).

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { addDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { isBeds24Configured, pushAvailabilityAndRates } from "@/lib/services/beds24.service";

const SYNC_WINDOW_DAYS = 365;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const provided =
    request.nextUrl.searchParams.get("secret") ??
    request.headers.get("x-cron-secret");

  if (secret && provided !== secret) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  if (!isBeds24Configured()) {
    return NextResponse.json({ message: "Beds24 no configurado. Nada que sincronizar." });
  }

  const rooms = await prisma.room.findMany({
    where: { beds24RoomId: { not: null } },
  });

  const today = new Date();
  const results = await Promise.allSettled(
    rooms.map((room) =>
      pushAvailabilityAndRates(room.id, today, addDays(today, SYNC_WINDOW_DAYS), {
        throwOnError: true,
      })
    )
  );

  const failed = results.filter((r) => r.status === "rejected").length;

  return NextResponse.json({
    message: `Reconciliación completada: ${rooms.length} habitación(es) procesadas, ${failed} fallo(s).`,
  });
}
