// app/api/stats/ine-report/route.ts
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { buildIneReport, ineReportToCsv } from "@/lib/services/ine-report.service";
import { requireAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const year = Number(searchParams.get("year")) || new Date().getFullYear();
    const month = Number(searchParams.get("month")) || new Date().getMonth() + 1;

    const report = await buildIneReport(year, month);
    const csv = ineReportToCsv(report);

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="informe-ine-${year}-${String(month).padStart(2, "0")}.csv"`,
      },
    });
  } catch (error) {
    console.error("[GET /api/stats/ine-report]", error);
    return NextResponse.json({ error: "Error al generar el informe." }, { status: 500 });
  }
}
