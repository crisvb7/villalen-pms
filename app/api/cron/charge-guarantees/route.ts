// app/api/cron/charge-guarantees/route.ts
// Red de seguridad: cobra automáticamente las reservas cuya fecha de entrada
// ya ha llegado (o pasado) y que nadie cobró a mano antes — "el día de la
// reserva como muy tarde" (ver vercel.json para el horario). No hace nada
// mientras Booking.cardGuaranteeToken siga vacío (o sea, hasta que el TPV
// Virtual esté activo de verdad) — ver lib/services/redsys.service.ts.

import { NextRequest, NextResponse } from "next/server";
import { chargeDueGuarantees } from "@/lib/services/redsys.service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const provided =
    request.nextUrl.searchParams.get("secret") ??
    request.headers.get("x-cron-secret");

  if (secret && provided !== secret) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const { bookingIds, errors } = await chargeDueGuarantees();
    return NextResponse.json({
      message: `${bookingIds.length} reserva(s) cobrada(s), ${errors.length} error(es).`,
      bookingIds,
      errors,
    });
  } catch (error) {
    console.error("[GET /api/cron/charge-guarantees]", error);
    return NextResponse.json(
      { error: "No se pudo procesar el cobro automático." },
      { status: 500 }
    );
  }
}
