// app/api/guest-app/auth/login/route.ts
// Login de la app de huéspedes: canjea el código de acceso (generado desde
// la web o la app de staff) por un JWT. Sin registro, sin email/contraseña.

import { NextRequest, NextResponse } from "next/server";
import {
  findBookingByGuestAccessCode,
  recordGuestLogin,
  serializeGuestBooking,
} from "@/lib/services/guest-access.service";
import { signGuestToken } from "@/lib/guest-auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const code = typeof body?.code === "string" ? body.code.trim() : "";

  if (!code) {
    return NextResponse.json({ error: "Introduce el código de acceso." }, { status: 400 });
  }

  const match = await findBookingByGuestAccessCode(code);
  if (!match || !match.guestAccessCodeSetAt) {
    return NextResponse.json({ error: "Código incorrecto." }, { status: 401 });
  }

  const booking = await recordGuestLogin(match.id);
  const token = await signGuestToken(booking.id, match.guestAccessCodeSetAt);

  return NextResponse.json({
    data: { token, booking: serializeGuestBooking(booking) },
  });
}
