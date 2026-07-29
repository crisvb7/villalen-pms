// app/api/cash-sessions/route.ts
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { getAllSessions, getOpenSession, openCashSession } from "@/lib/services/cash.service";
import { requireAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    if (searchParams.get("open") === "true") {
      const open = await getOpenSession();
      return NextResponse.json({ data: open });
    }

    const sessions = await getAllSessions();
    return NextResponse.json({ data: sessions });
  } catch (error) {
    console.error("[GET /api/cash-sessions]", error);
    return NextResponse.json({ error: "Error al obtener las cajas." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const body = await request.json();
    if (body.openingBalance === undefined) {
      return NextResponse.json({ error: "Falta el fondo inicial." }, { status: 400 });
    }

    const session = await openCashSession(Number(body.openingBalance), body.notes);
    return NextResponse.json({ data: session }, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Error al abrir la caja.";
    return NextResponse.json({ error: msg }, { status: 422 });
  }
}
