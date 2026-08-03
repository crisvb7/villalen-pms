// app/api/rooms/route.ts
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { getAllRooms, createRoom } from "@/lib/services/room.service";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const rooms = await getAllRooms();
    return NextResponse.json({ data: rooms });
  } catch (error) {
    console.error("[GET /api/rooms]", error);
    return NextResponse.json(
      { error: "Error al obtener habitaciones." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, description, capacity, basePrice, amenities, imageUrl, type } = body;

    if (!name || !capacity || !basePrice) {
      return NextResponse.json(
        { error: "Los campos nombre, capacidad y precio son obligatorios." },
        { status: 400 }
      );
    }

    const room = await createRoom({
      name,
      description,
      capacity: Number(capacity),
      basePrice: Number(basePrice),
      type,
      amenities: amenities ?? [],
      imageUrl,
    });

    return NextResponse.json({ data: room }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/rooms]", error);
    return NextResponse.json(
      { error: "Error al crear la habitación." },
      { status: 500 }
    );
  }
}
