// app/api/guests/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const guests = await prisma.guest.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ data: guests });
  } catch (error) {
    console.error("[GET /api/guests]", error);
    return NextResponse.json(
      { error: "Error al obtener huéspedes." },
      { status: 500 }
    );
  }
}
