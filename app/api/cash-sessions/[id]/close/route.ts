// app/api/cash-sessions/[id]/close/route.ts
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { closeCashSession } from "@/lib/services/cash.service";
import { requireAuth } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const body = await request.json();
    if (body.closingBalance === undefined) {
      return NextResponse.json({ error: "Falta el efectivo contado." }, { status: 400 });
    }

    const session = await closeCashSession(params.id, Number(body.closingBalance));
    return NextResponse.json({ data: session });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Error al cerrar la caja.";
    return NextResponse.json({ error: msg }, { status: 422 });
  }
}
