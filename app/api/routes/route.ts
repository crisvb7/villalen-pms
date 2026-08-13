// app/api/routes/route.ts
// CRUD de la guía de rutas para el backoffice (web y app de staff).
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { getAllRoutes, createRoute } from "@/lib/services/route.service";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const routes = await getAllRoutes();
    return NextResponse.json({ data: routes });
  } catch (error) {
    console.error("[GET /api/routes]", error);
    return NextResponse.json(
      { error: "Error al obtener las rutas." },
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
    const { name, category, distanceKm, durationMin, description } = body;

    if (!name || !category || !distanceKm || !durationMin || !description) {
      return NextResponse.json(
        {
          error:
            "Los campos nombre, categoría, distancia, duración y descripción son obligatorios.",
        },
        { status: 400 }
      );
    }

    const route = await createRoute({
      name,
      category,
      isCaminoStage: body.isCaminoStage,
      distanceKm: Number(distanceKm),
      durationMin: Number(durationMin),
      elevationGainM: body.elevationGainM !== undefined ? Number(body.elevationGainM) : undefined,
      elevationLossM: body.elevationLossM !== undefined ? Number(body.elevationLossM) : undefined,
      difficulty: body.difficulty,
      icon: body.icon,
      imageUrl: body.imageUrl,
      description,
      pointsOfInterest: body.pointsOfInterest,
      isPublished: body.isPublished,
      order: body.order !== undefined ? Number(body.order) : undefined,
    });

    return NextResponse.json({ data: route }, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Error al crear la ruta.";
    return NextResponse.json({ error: msg }, { status: 422 });
  }
}
