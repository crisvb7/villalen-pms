// app/api/routes/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import {
  getRouteByIdAdmin,
  updateRoute,
  deleteRoute,
} from "@/lib/services/route.service";
import { requireAuth } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const route = await getRouteByIdAdmin(params.id);
    if (!route) {
      return NextResponse.json({ error: "Ruta no encontrada." }, { status: 404 });
    }
    return NextResponse.json({ data: route });
  } catch (error) {
    console.error("[GET /api/routes/:id]", error);
    return NextResponse.json(
      { error: "Error al obtener la ruta." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const route = await updateRoute(params.id, {
      name: body.name,
      category: body.category,
      isCaminoStage: body.isCaminoStage,
      distanceKm: body.distanceKm !== undefined ? Number(body.distanceKm) : undefined,
      distanceFromHotelKm:
        body.distanceFromHotelKm !== undefined
          ? body.distanceFromHotelKm === "" || body.distanceFromHotelKm === null
            ? null
            : Number(body.distanceFromHotelKm)
          : undefined,
      durationMin: body.durationMin !== undefined ? Number(body.durationMin) : undefined,
      elevationGainM: body.elevationGainM !== undefined ? Number(body.elevationGainM) : undefined,
      elevationLossM: body.elevationLossM !== undefined ? Number(body.elevationLossM) : undefined,
      difficulty: body.difficulty,
      icon: body.icon,
      imageUrl: body.imageUrl,
      description: body.description,
      pointsOfInterest: body.pointsOfInterest,
      isPublished: body.isPublished,
      order: body.order !== undefined ? Number(body.order) : undefined,
    });
    return NextResponse.json({ data: route });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Error al actualizar la ruta.";
    return NextResponse.json({ error: msg }, { status: 422 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    await deleteRoute(params.id);
    return NextResponse.json({ message: "Ruta eliminada correctamente." });
  } catch (error) {
    console.error("[DELETE /api/routes/:id]", error);
    return NextResponse.json(
      { error: "Error al eliminar la ruta." },
      { status: 500 }
    );
  }
}
