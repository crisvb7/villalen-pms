// app/api/guest-app/messages/route.ts
// Chat con recepción. GET marca como leídos los mensajes de STAFF (el
// huésped acaba de abrir la conversación) y devuelve el historial.

import { NextRequest, NextResponse } from "next/server";
import { requireGuestAuth } from "@/lib/guest-auth";
import {
  listMessages,
  markMessagesRead,
  sendGuestMessage,
} from "@/lib/services/guest-message.service";
import { MessageSender } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET() {
  const booking = await requireGuestAuth();
  if (!booking) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  await markMessagesRead(booking.id, MessageSender.GUEST);
  const messages = await listMessages(booking.id);
  return NextResponse.json({ data: messages });
}

export async function POST(request: NextRequest) {
  const booking = await requireGuestAuth();
  if (!booking) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const text = typeof body?.body === "string" ? body.body : "";

  try {
    const message = await sendGuestMessage(booking.id, text);
    return NextResponse.json({ data: message });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "No se pudo enviar el mensaje.";
    return NextResponse.json({ error: msg }, { status: 422 });
  }
}
