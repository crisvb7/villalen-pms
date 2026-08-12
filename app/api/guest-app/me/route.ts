// app/api/guest-app/me/route.ts
// Comprueba si el token guardado en la app sigue siendo válido (no caducado
// y el código no se ha regenerado) y devuelve el estado actual de la
// reserva. La app lo llama al arrancar para decidir qué pantalla mostrar.

import { NextResponse } from "next/server";
import { requireGuestAuth } from "@/lib/guest-auth";
import { getBookingWithRoom, serializeGuestBooking } from "@/lib/services/guest-access.service";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireGuestAuth();
  if (!auth) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const booking = await getBookingWithRoom(auth.id);
  if (!booking) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  return NextResponse.json({ data: serializeGuestBooking(booking) });
}
