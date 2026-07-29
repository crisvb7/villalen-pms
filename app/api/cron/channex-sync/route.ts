// app/api/cron/channex-sync/route.ts
// Red de seguridad: republica disponibilidad + tarifa de todas las
// habitaciones mapeadas a Channex, por si alguna sincronización puntual
// falló silenciosamente. Pensado para ejecutarse una vez al día (ver
// "crons" en vercel.json).

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { addDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { isChannexConfigured, pushAvailabilityAndRates } from "@/lib/services/channex.service";

const SYNC_WINDOW_DAYS = 365;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const provided =
    request.nextUrl.searchParams.get("secret") ??
    request.headers.get("x-cron-secret");

  if (secret && provided !== secret) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  if (!isChannexConfigured()) {
    return NextResponse.json({ message: "Channex no configurado. Nada que sincronizar." });
  }

  const rooms = await prisma.room.findMany({
    where: {
      channexRoomTypeId: { not: null },
      channexRatePlanId: { not: null },
    },
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
