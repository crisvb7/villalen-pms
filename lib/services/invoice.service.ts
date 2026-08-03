// lib/services/invoice.service.ts
// Capa de servicio para la gestión de Facturas
// AVISO PCI-DSS: No se almacenan ni procesan datos de tarjetas en este sistema.
// Los pagos se gestionan externamente (TPV físico / Transferencia bancaria).

import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import { PaymentMethod } from "@prisma/client";
import { InvoiceDocument } from "@/lib/pdf/invoice-document";
import { renderPdfBuffer } from "@/lib/pdf/render";
import { getHeroImage, getLogoImage } from "@/lib/pdf/assets";
import { sendEmail } from "@/lib/email/client";
import { InvoiceEmail } from "@/lib/email/templates/InvoiceEmail";
import { formatCurrency, getRoomDisplayName } from "@/lib/utils";

export const IVA_RATE = 0.10; // IVA turístico reducido (10%)

// Generar número de factura correlativo: FAC-YYYY-NNNN
async function generateInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const lastInvoice = await prisma.invoice.findFirst({
    where: { invoiceNumber: { startsWith: `FAC-${year}-` } },
    orderBy: { createdAt: "desc" },
  });

  let sequence = 1;
  if (lastInvoice) {
    const parts = lastInvoice.invoiceNumber.split("-");
    sequence = parseInt(parts[2]) + 1;
  }

  return `FAC-${year}-${String(sequence).padStart(4, "0")}`;
}

export async function createInvoice(bookingId: string) {
  // Verificar que la reserva existe y está confirmada
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { guest: true, room: true },
  });

  if (!booking) throw new Error("Reserva no encontrada.");
  if (!["CONFIRMED", "CHECKED_IN", "CHECKED_OUT"].includes(booking.status)) {
    throw new Error(
      "Solo se pueden facturar reservas confirmadas o finalizadas."
    );
  }

  // Verificar que no tiene ya una factura
  const existing = await prisma.invoice.findFirst({
    where: { bookingId },
  });
  if (existing) throw new Error("Esta reserva ya tiene una factura asociada.");

  const total = parseFloat(booking.totalAmount.toString());
  const subtotal = parseFloat((total / (1 + IVA_RATE)).toFixed(2));
  const tax = parseFloat((total - subtotal).toFixed(2));
  const invoiceNumber = await generateInvoiceNumber();

  const invoice = await prisma.invoice.create({
    data: {
      bookingId,
      subtotal,
      tax,
      total,
      invoiceNumber,
      isPaid: booking.depositPaid,
    },
    include: { booking: { include: { guest: true, room: true } } },
  });

  const pdfBuffer = await renderInvoicePdf(invoice.id);
  await sendEmail({
    to: invoice.booking.guest.email,
    subject: `Tu factura ${invoice.invoiceNumber}`,
    react: InvoiceEmail({
      guestFirstName: invoice.booking.guest.firstName,
      invoiceNumber: invoice.invoiceNumber,
      totalAmount: formatCurrency(invoice.total.toString()),
    }),
    attachments: [{ filename: `${invoice.invoiceNumber}.pdf`, content: pdfBuffer }],
  });

  return invoice;
}

export async function getInvoiceById(id: string) {
  return prisma.invoice.findUnique({
    where: { id },
    include: {
      booking: {
        include: { guest: true, room: true },
      },
      extras: { orderBy: { createdAt: "asc" } },
    },
  });
}

export async function getAllInvoices() {
  return prisma.invoice.findMany({
    include: {
      booking: { include: { guest: true, room: true } },
      extras: { orderBy: { createdAt: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Recalcula subtotal/tax/total de la factura a partir del importe de la
 * reserva más todos sus servicios adicionales (mismo tipo de IVA para todo,
 * ver IVA_RATE).
 */
async function recalculateInvoiceTotals(invoiceId: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { booking: true, extras: true },
  });
  if (!invoice) throw new Error("Factura no encontrada.");

  const accommodationGross = parseFloat(invoice.booking.totalAmount.toString());
  const extrasGross = invoice.extras.reduce(
    (sum, e) => sum + parseFloat(e.amount.toString()),
    0
  );
  const totalGross = accommodationGross + extrasGross;
  const subtotal = parseFloat((totalGross / (1 + IVA_RATE)).toFixed(2));
  const tax = parseFloat((totalGross - subtotal).toFixed(2));

  return prisma.invoice.update({
    where: { id: invoiceId },
    data: { subtotal, tax, total: totalGross },
    include: { booking: { include: { guest: true, room: true } }, extras: { orderBy: { createdAt: "asc" } } },
  });
}

export async function addInvoiceExtra(
  invoiceId: string,
  input: { description: string; amount: number }
) {
  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) throw new Error("Factura no encontrada.");
  if (invoice.isPaid) {
    throw new Error("No se pueden añadir servicios a una factura ya pagada.");
  }
  if (!input.description.trim() || !(input.amount > 0)) {
    throw new Error("El servicio necesita una descripción y un importe mayor que 0.");
  }

  await prisma.invoiceExtra.create({
    data: { invoiceId, description: input.description.trim(), amount: input.amount },
  });

  return recalculateInvoiceTotals(invoiceId);
}

export async function removeInvoiceExtra(invoiceId: string, extraId: string) {
  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) throw new Error("Factura no encontrada.");
  if (invoice.isPaid) {
    throw new Error("No se pueden quitar servicios de una factura ya pagada.");
  }

  const extra = await prisma.invoiceExtra.findUnique({ where: { id: extraId } });
  if (!extra || extra.invoiceId !== invoiceId) {
    throw new Error("Servicio no encontrado en esta factura.");
  }

  await prisma.invoiceExtra.delete({ where: { id: extraId } });

  return recalculateInvoiceTotals(invoiceId);
}

/**
 * Genera el PDF de una factura ya existente (reutilizado por el email
 * automático y por GET /api/invoices/:id/pdf).
 */
export async function renderInvoicePdf(invoiceId: string): Promise<Buffer> {
  const invoice = await getInvoiceById(invoiceId);
  if (!invoice) throw new Error("Factura no encontrada.");

  const { booking } = invoice;
  const nights = Math.max(
    1,
    Math.round((booking.checkOutDate.getTime() - booking.checkInDate.getTime()) / 86_400_000)
  );
  const accommodationTotal = parseFloat(booking.totalAmount.toString());
  const pricePerNight = (accommodationTotal / nights).toFixed(2);

  return renderPdfBuffer(
    InvoiceDocument({
      documentTitle: "FACTURA",
      documentNumber: invoice.invoiceNumber,
      issueDate: invoice.issueDate,
      subtotal: invoice.subtotal.toString(),
      tax: invoice.tax.toString(),
      total: invoice.total.toString(),
      client: {
        name: `${booking.guest.firstName} ${booking.guest.lastName}`,
        documentId: booking.guest.documentId,
        email: booking.guest.email,
        phone: booking.guest.phone,
      },
      roomName: getRoomDisplayName(booking),
      pricePerNight,
      accommodationTotal: accommodationTotal.toFixed(2),
      checkInDate: booking.checkInDate,
      checkOutDate: booking.checkOutDate,
      extras: invoice.extras.map((e) => ({
        description: e.description,
        amount: e.amount.toString(),
        date: e.createdAt,
      })),
      isPaid: invoice.isPaid,
      paymentMethod: invoice.paymentMethod ?? undefined,
      heroImage: getHeroImage(),
      logoImage: getLogoImage(),
    })
  );
}

export async function markInvoiceAsPaid(id: string, paymentMethod?: PaymentMethod) {
  const invoice = await prisma.invoice.update({
    where: { id },
    data: { isPaid: true, paymentMethod: paymentMethod ?? PaymentMethod.OTHER },
  });

  // Actualizar también el depositPaid en la reserva
  await prisma.booking.update({
    where: { id: invoice.bookingId },
    data: { depositPaid: true },
  });

  return invoice;
}
