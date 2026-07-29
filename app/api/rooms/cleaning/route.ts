// app/api/rooms/cleaning/route.ts
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import {
  getCleaningStatus,
  updateCleaningStatus,
} from "@/lib/services/room.service";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const rooms = await getCleaningStatus();
    return NextResponse.json({ data: rooms });
  } catch (error) {
    console.error("[GET /api/rooms/cleaning]", error);
    return NextResponse.json(
      { error: "Error al obtener estado de limpieza." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, isClean } = body;

    if (!id || typeof isClean !== "boolean") {
      return NextResponse.json(
        { error: "Se requieren 'id' y 'isClean' (boolean)." },
        { status: 400 }
      );
    }

    const room = await updateCleaningStatus(id, isClean);
    return NextResponse.json({ data: room });
  } catch (error) {
    console.error("[PATCH /api/rooms/cleaning]", error);
    return NextResponse.json(
      { error: "Error al actualizar estado de limpieza." },
      { status: 500 }
    );
  }
}
