// app/api/stats/route.ts
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { getAvailableYears, getYearStats } from "@/lib/services/stats.service";
import { requireAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const year = Number(searchParams.get("year")) || new Date().getFullYear();

    const [stats, availableYears] = await Promise.all([
      getYearStats(year),
      getAvailableYears(),
    ]);

    return NextResponse.json({ data: { ...stats, availableYears } });
  } catch (error) {
    console.error("[GET /api/stats]", error);
    return NextResponse.json({ error: "Error al obtener estadísticas." }, { status: 500 });
  }
}
