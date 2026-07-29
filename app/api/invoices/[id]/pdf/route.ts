// app/api/invoices/[id]/pdf/route.ts
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { getInvoiceById, renderInvoicePdf } from "@/lib/services/invoice.service";
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
      return NextResponse.json({ error: "Factura no encontrada." }, { status: 404 });
    }

    const buffer = await renderInvoicePdf(params.id);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${invoice.invoiceNumber}.pdf"`,
      },
    });
  } catch (error) {
    console.error("[GET /api/invoices/:id/pdf]", error);
    return NextResponse.json({ error: "Error al generar el PDF." }, { status: 500 });
  }
}
