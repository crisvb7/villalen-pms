// app/api/bookings/[id]/charge-guarantee/route.ts
// Cobro manual (disparado por el personal) de la tarjeta de garantía —
// botón "Cobrar reserva" en /admin/reservas. Ver lib/services/redsys.service.ts.

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { chargeGuaranteedCard } from "@/lib/services/redsys.service";
import { requireAuth } from "@/lib/auth";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const result = await chargeGuaranteedCard(params.id);
  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 502 });
  }
  return NextResponse.json({ message: result.message });
}
