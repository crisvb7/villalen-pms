// app/api/services/today/route.ts
// Tablón operativo del personal: todas las reservas activas de un día
// (por defecto hoy) con el estado de sus 3 peticiones diarias
// (desayuno/cena/limpieza). El toggle real se hace por reserva contra
// /api/bookings/[id]/services — este endpoint solo lee el conjunto.

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { listTodayBoard } from "@/lib/services/guest-service-request.service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const dateParam = request.nextUrl.searchParams.get("date");
    const date = dateParam ? new Date(dateParam) : new Date();
    const data = await listTodayBoard(date);
    return NextResponse.json({ data });
  } catch (error) {
    console.error("[GET /api/services/today]", error);
    return NextResponse.json({ error: "Error al obtener el tablón de servicios." }, { status: 500 });
  }
}
