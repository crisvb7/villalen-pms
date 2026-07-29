// app/api/bookings/[id]/ses-submit/route.ts
// Envío manual (disparado por el personal) de la Ficha Policial a SES.HOSPEDAJES.

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { submitTravelerReport } from "@/lib/services/ses.service";
import { requireAuth } from "@/lib/auth";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const result = await submitTravelerReport(params.id);
  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 502 });
  }
  return NextResponse.json({ message: result.message });
}
