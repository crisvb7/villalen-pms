// app/api/rooms/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import {
  getRoomById,
  updateRoom,
  deleteRoom,
} from "@/lib/services/room.service";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const room = await getRoomById(params.id);
    if (!room) {
      return NextResponse.json(
        { error: "Habitación no encontrada." },
        { status: 404 }
      );
    }
    return NextResponse.json({ data: room });
  } catch (error) {
    console.error("[GET /api/rooms/:id]", error);
    return NextResponse.json(
      { error: "Error al obtener la habitación." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const room = await updateRoom(params.id, {
      name: body.name,
      description: body.description,
      capacity: body.capacity ? Number(body.capacity) : undefined,
      basePrice: body.basePrice ? Number(body.basePrice) : undefined,
      isClean: body.isClean,
      amenities: body.amenities,
      imageUrl: body.imageUrl,
    });
    return NextResponse.json({ data: room });
  } catch (error) {
    console.error("[PATCH /api/rooms/:id]", error);
    return NextResponse.json(
      { error: "Error al actualizar la habitación." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await deleteRoom(params.id);
    return NextResponse.json({ message: "Habitación eliminada correctamente." });
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : "Error al eliminar la habitación.";
    return NextResponse.json({ error: msg }, { status: 409 });
  }
}
