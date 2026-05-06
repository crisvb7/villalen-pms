// app/api/invoices/route.ts
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { createInvoice, getAllInvoices } from "@/lib/services/invoice.service";

export async function GET() {
  try {
    const invoices = await getAllInvoices();
    return NextResponse.json({ data: invoices });
  } catch (error) {
    console.error("[GET /api/invoices]", error);
    return NextResponse.json(
      { error: "Error al obtener facturas." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookingId } = body;

    if (!bookingId) {
      return NextResponse.json(
        { error: "Se requiere bookingId." },
        { status: 400 }
      );
    }

    const invoice = await createInvoice(bookingId);
    return NextResponse.json({ data: invoice }, { status: 201 });
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : "Error al crear la factura.";
    console.error("[POST /api/invoices]", error);
    return NextResponse.json({ error: msg }, { status: 422 });
  }
}
