// app/api/guest-app/messages/unread-count/route.ts
// Contador para el badge de la pestaña "Recepción" — a diferencia de
// GET /api/guest-app/messages, este NO marca los mensajes como leídos (la
// app lo sondea en segundo plano; abrir el chat de verdad sigue siendo lo
// único que los marca leídos).

import { NextResponse } from "next/server";
import { requireGuestAuth } from "@/lib/guest-auth";
import { countUnread } from "@/lib/services/guest-message.service";
import { MessageSender } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET() {
  const booking = await requireGuestAuth();
  if (!booking) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const count = await countUnread(booking.id, MessageSender.GUEST);
  return NextResponse.json({ data: { count } });
}
