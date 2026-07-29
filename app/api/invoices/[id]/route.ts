// app/api/invoices/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import {
  getInvoiceById,
  markInvoiceAsPaid,
} from "@/lib/services/invoice.service";
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
    const invoice = await getInvoiceById(params.id);
    if (!invoice) {
      return NextResponse.json(
        { error: "Factura no encontrada." },
        { status: 404 }
      );
    }
    return NextResponse.json({ data: invoice });
  } catch (error) {
    console.error("[GET /api/invoices/:id]", error);
    return NextResponse.json(
      { error: "Error al obtener la factura." },
      { status: 500 }
    );
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

    if (body.isPaid === true) {
      const invoice = await markInvoiceAsPaid(params.id);
      return NextResponse.json({ data: invoice });
    }

    return NextResponse.json(
      { error: "Operación no soportada." },
      { status: 400 }
    );
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : "Error al actualizar la factura.";
    return NextResponse.json({ error: msg }, { status: 422 });
  }
}
