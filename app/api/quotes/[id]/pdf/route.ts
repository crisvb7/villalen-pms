// app/api/quotes/[id]/pdf/route.ts
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { getQuoteById } from "@/lib/services/quote.service";
import { InvoiceDocument } from "@/lib/pdf/invoice-document";
import { renderPdfBuffer } from "@/lib/pdf/render";
import { getHeroImage, getLogoImage } from "@/lib/pdf/assets";
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
      return NextResponse.json({ error: "Factura proforma no encontrada." }, { status: 404 });
    }

    const buffer = await renderPdfBuffer(
      InvoiceDocument({
        documentTitle: "FACTURA PROFORMA",
        documentNumber: quote.quoteNumber,
        issueDate: quote.createdAt,
        validUntil: quote.validUntil,
        subtotal: quote.subtotal.toString(),
        tax: quote.tax.toString(),
        total: quote.total.toString(),
        client: { name: quote.guestName, email: quote.guestEmail, phone: quote.guestPhone },
        roomName: quote.roomName,
        pricePerNight: quote.pricePerNight.toString(),
        checkInDate: quote.checkInDate,
        checkOutDate: quote.checkOutDate,
        heroImage: getHeroImage(),
        logoImage: getLogoImage(),
      })
    );

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${quote.quoteNumber}.pdf"`,
      },
    });
  } catch (error) {
    console.error("[GET /api/quotes/:id/pdf]", error);
    return NextResponse.json({ error: "Error al generar el PDF." }, { status: 500 });
  }
}
