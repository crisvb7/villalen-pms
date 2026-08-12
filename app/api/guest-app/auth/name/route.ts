// app/api/guest-app/auth/name/route.ts
// Guarda el nombre de cortesía la primera vez que se usa un código de
// acceso vigente (ver Booking.guestDisplayName en el schema).

import { NextRequest, NextResponse } from "next/server";
import { requireGuestAuth } from "@/lib/guest-auth";
import { setGuestDisplayName, serializeGuestBooking } from "@/lib/services/guest-access.service";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const booking = await requireGuestAuth();
  if (!booking) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name : "";

  try {
    const updated = await setGuestDisplayName(booking.id, name);
    return NextResponse.json({ data: serializeGuestBooking(updated) });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "No se pudo guardar el nombre.";
    return NextResponse.json({ error: msg }, { status: 422 });
  }
}
