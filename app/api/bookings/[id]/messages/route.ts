// app/api/bookings/[id]/messages/route.ts
// Chat de una reserva visto/respondido por el personal (web o app de
// staff). El huésped usa /api/guest-app/messages para el mismo hilo.

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { listMessages, markMessagesRead, sendStaffMessage } from "@/lib/services/guest-message.service";
import { MessageSender } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    // Al abrir el chat desde el panel, se marcan como leídos los mensajes
    // del huésped (igual que hace la app de huéspedes al revés).
    await markMessagesRead(params.id, MessageSender.STAFF);
    const data = await listMessages(params.id);
    return NextResponse.json({ data });
  } catch (error) {
    console.error("[GET /api/bookings/:id/messages]", error);
    return NextResponse.json({ error: "Error al obtener los mensajes." }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const { body, replyToId } = (await request.json()) as { body?: string; replyToId?: string };
    if (!body) {
      return NextResponse.json({ error: "El mensaje no puede estar vacío." }, { status: 400 });
    }
    const data = await sendStaffMessage(params.id, body, replyToId ?? null);
    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo enviar el mensaje.";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
