// app/api/guest-app/routes/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireGuestAuth } from "@/lib/guest-auth";
import { getPublishedRouteById } from "@/lib/services/route.service";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const booking = await requireGuestAuth();
  if (!booking) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const route = await getPublishedRouteById(params.id);
  if (!route) {
    return NextResponse.json({ error: "Ruta no encontrada." }, { status: 404 });
  }
  return NextResponse.json({ data: route });
}
