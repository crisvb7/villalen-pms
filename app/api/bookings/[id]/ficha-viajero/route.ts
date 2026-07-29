// app/api/bookings/[id]/ficha-viajero/route.ts
// Endpoint para generar la ficha de viajero (parte de hospedería)

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { generateTravelerRecordXML } from "@/lib/utils/traveler-record";
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
    const xml = await generateTravelerRecordXML(params.id);

    return new NextResponse(xml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Content-Disposition": `attachment; filename="ficha-viajero-${params.id.slice(-8)}.xml"`,
      },
    });
  } catch (error) {
    const msg =
      error instanceof Error
        ? error.message
        : "Error al generar la ficha de viajero.";
    return NextResponse.json({ error: msg }, { status: 404 });
  }
}
