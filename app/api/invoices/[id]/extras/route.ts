// app/api/invoices/[id]/extras/route.ts
// Servicios adicionales de una factura (desayuno, etc.).

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { addInvoiceExtra } from "@/lib/services/invoice.service";
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
    if (!body.description || body.amount === undefined) {
      return NextResponse.json(
        { error: "Se requiere descripción e importe." },
        { status: 400 }
      );
    }

    const invoice = await addInvoiceExtra(params.id, {
      description: body.description,
      amount: Number(body.amount),
      quantity: body.quantity !== undefined ? Number(body.quantity) : undefined,
      date: body.date || undefined,
    });

    return NextResponse.json({ data: invoice }, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Error al añadir el servicio.";
    return NextResponse.json({ error: msg }, { status: 422 });
  }
}
