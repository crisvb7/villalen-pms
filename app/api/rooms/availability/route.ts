// app/api/rooms/availability/route.ts
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { getAvailableRooms } from "@/lib/services/room.service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const checkIn = searchParams.get("checkIn");
    const checkOut = searchParams.get("checkOut");
    const guests = parseInt(searchParams.get("guests") ?? "1");

    if (!checkIn || !checkOut) {
      return NextResponse.json(
        { error: "Se requieren los parámetros checkIn y checkOut." },
        { status: 400 }
      );
    }

    const rooms = await getAvailableRooms(checkIn, checkOut, guests);
    return NextResponse.json({ data: rooms });
  } catch (error) {
    const msg =
      error instanceof Error
        ? error.message
        : "Error al buscar disponibilidad.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
