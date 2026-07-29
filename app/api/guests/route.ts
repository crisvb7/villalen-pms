// app/api/guests/route.ts
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

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
