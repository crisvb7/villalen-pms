// app/api/bookings/[id]/clear-guest-chat/route.ts
// Botón manual del personal (web o app de staff) para ocultar el chat al
// huésped sin esperar al checkout/cancelación automáticos — ver
// lib/services/guest-message.service.ts#clearGuestChat. No borra nada: el
// historial completo sigue disponible en GET /api/bookings/:id/messages.

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { clearGuestChat } from "@/lib/services/guest-message.service";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const booking = await clearGuestChat(params.id);
    return NextResponse.json({ data: booking });
  } catch (error) {
    console.error("[POST /api/bookings/:id/clear-guest-chat]", error);
    return NextResponse.json(
      { error: "No se pudo ocultar el chat al huésped." },
      { status: 500 }
    );
  }
}
