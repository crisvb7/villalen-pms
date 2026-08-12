// app/api/settings/route.ts
// Ajustes globales del hotel, gestionados por el personal (web o app de
// staff). De momento solo si el servicio de cena está activo.

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getHotelSettings, setDinnerServiceEnabled } from "@/lib/services/hotel-setting.service";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const data = await getHotelSettings();
  return NextResponse.json({ data });
}

export async function PATCH(request: NextRequest) {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const { dinnerServiceEnabled } = (await request.json()) as { dinnerServiceEnabled?: boolean };
    if (typeof dinnerServiceEnabled !== "boolean") {
      return NextResponse.json({ error: "Falta dinnerServiceEnabled (boolean)." }, { status: 400 });
    }
    const data = await setDinnerServiceEnabled(dinnerServiceEnabled);
    return NextResponse.json({ data });
  } catch (error) {
    console.error("[PATCH /api/settings]", error);
    return NextResponse.json({ error: "No se pudo guardar el ajuste." }, { status: 500 });
  }
}
