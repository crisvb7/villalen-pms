// app/api/invoices/[id]/extras/[extraId]/route.ts

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { removeInvoiceExtra } from "@/lib/services/invoice.service";
import { requireAuth } from "@/lib/auth";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; extraId: string } }
) {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const invoice = await removeInvoiceExtra(params.id, params.extraId);
    return NextResponse.json({ data: invoice });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Error al quitar el servicio.";
    return NextResponse.json({ error: msg }, { status: 422 });
  }
}
