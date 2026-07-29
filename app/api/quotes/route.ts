// app/api/quotes/route.ts
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { getAllQuotes, createQuote } from "@/lib/services/quote.service";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const quotes = await getAllQuotes();
    return NextResponse.json({ data: quotes });
  } catch (error) {
    console.error("[GET /api/quotes]", error);
    return NextResponse.json({ error: "Error al obtener presupuestos." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const body = await request.json();

    if (
      !body.guestName ||
      !body.guestEmail ||
      !body.roomName ||
      !body.pricePerNight ||
      !body.checkInDate ||
      !body.checkOutDate ||
      !body.validUntil
    ) {
      return NextResponse.json(
        { error: "Faltan campos obligatorios del presupuesto." },
        { status: 400 }
      );
    }

    const quote = await createQuote({
      guestName: body.guestName,
      guestEmail: body.guestEmail,
      guestPhone: body.guestPhone,
      roomName: body.roomName,
      pricePerNight: Number(body.pricePerNight),
      checkInDate: body.checkInDate,
      checkOutDate: body.checkOutDate,
      validUntil: body.validUntil,
      notes: body.notes,
    });

    return NextResponse.json({ data: quote }, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Error al crear el presupuesto.";
    console.error("[POST /api/quotes]", error);
    return NextResponse.json({ error: msg }, { status: 422 });
  }
}
