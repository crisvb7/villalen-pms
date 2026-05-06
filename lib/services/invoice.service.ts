// lib/services/invoice.service.ts
// Capa de servicio para la gestión de Facturas
// AVISO PCI-DSS: No se almacenan ni procesan datos de tarjetas en este sistema.
// Los pagos se gestionan externamente (TPV físico / Transferencia bancaria).

import { prisma } from "@/lib/prisma";
import { format } from "date-fns";

const IVA_RATE = 0.10; // IVA turístico reducido (10%)

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

  return prisma.invoice.create({
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
}

export async function getInvoiceById(id: string) {
  return prisma.invoice.findUnique({
    where: { id },
    include: {
      booking: {
        include: { guest: true, room: true },
      },
    },
  });
}

export async function getAllInvoices() {
  return prisma.invoice.findMany({
    include: {
      booking: { include: { guest: true, room: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function markInvoiceAsPaid(id: string) {
  const invoice = await prisma.invoice.update({
    where: { id },
    data: { isPaid: true },
  });

  // Actualizar también el depositPaid en la reserva
  await prisma.booking.update({
    where: { id: invoice.bookingId },
    data: { depositPaid: true },
  });

  return invoice;
}
