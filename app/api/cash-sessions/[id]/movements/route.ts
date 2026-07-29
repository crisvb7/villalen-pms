// app/api/cash-sessions/[id]/movements/route.ts
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { addCashMovement } from "@/lib/services/cash.service";
import { CashMovementType } from "@prisma/client";
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
    if (!body.type || !Object.values(CashMovementType).includes(body.type)) {
      return NextResponse.json({ error: "Tipo de movimiento inválido." }, { status: 400 });
    }
    if (!body.concept || body.amount === undefined) {
      return NextResponse.json({ error: "Faltan concepto e importe." }, { status: 400 });
    }

    const movement = await addCashMovement(params.id, {
      type: body.type,
      concept: body.concept,
      amount: Number(body.amount),
    });

    return NextResponse.json({ data: movement }, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Error al añadir el movimiento.";
    return NextResponse.json({ error: msg }, { status: 422 });
  }
}
