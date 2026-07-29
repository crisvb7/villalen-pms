// app/api/quotes/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { getQuoteById, updateQuoteStatus, deleteQuote } from "@/lib/services/quote.service";
import { QuoteStatus } from "@prisma/client";
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
    const quote = await getQuoteById(params.id);
    if (!quote) {
      return NextResponse.json({ error: "Presupuesto no encontrado." }, { status: 404 });
    }
    return NextResponse.json({ data: quote });
  } catch (error) {
    console.error("[GET /api/quotes/:id]", error);
    return NextResponse.json({ error: "Error al obtener el presupuesto." }, { status: 500 });
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
    if (!body.status || !Object.values(QuoteStatus).includes(body.status)) {
      return NextResponse.json({ error: "Estado inválido." }, { status: 400 });
    }

    const quote = await updateQuoteStatus(params.id, body.status as QuoteStatus);
    return NextResponse.json({ data: quote });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Error al actualizar el presupuesto.";
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
    await deleteQuote(params.id);
    return NextResponse.json({ message: "Presupuesto eliminado correctamente." });
  } catch (error) {
    console.error("[DELETE /api/quotes/:id]", error);
    return NextResponse.json({ error: "Error al eliminar el presupuesto." }, { status: 500 });
  }
}
