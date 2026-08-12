// app/api/guest-app/routes/route.ts
// Guía de rutas para la app de huéspedes — solo lectura, solo publicadas.
import { NextResponse } from "next/server";
import { requireGuestAuth } from "@/lib/guest-auth";
import { getPublishedRoutes } from "@/lib/services/route.service";

export const dynamic = "force-dynamic";

export async function GET() {
  const booking = await requireGuestAuth();
  if (!booking) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const routes = await getPublishedRoutes();
  return NextResponse.json({ data: routes });
}
