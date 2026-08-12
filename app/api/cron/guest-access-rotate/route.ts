// app/api/cron/guest-access-rotate/route.ts
// Genera el código de acceso a la app de huéspedes para las reservas que
// llegan hoy y que nadie generó a mano de antemano (ver vercel.json para el
// horario). El código queda en claro en Booking.guestAccessCodePlain hasta
// que el huésped hace login o el personal lo regenera/revoca — ver
// lib/services/guest-access.service.ts.

import { NextRequest, NextResponse } from "next/server";
import { autoGenerateGuestAccessCodesForArrivals } from "@/lib/services/guest-access.service";

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
    const { bookingIds } = await autoGenerateGuestAccessCodesForArrivals();
    return NextResponse.json({
      message: `${bookingIds.length} código(s) generado(s).`,
      bookingIds,
    });
  } catch (error) {
    console.error("[GET /api/cron/guest-access-rotate]", error);
    return NextResponse.json(
      { error: "No se pudo generar los códigos de acceso." },
      { status: 500 }
    );
  }
}
