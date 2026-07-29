// lib/services/quote.service.ts
// Capa de servicio para Presupuestos.
// Un presupuesto es una foto de precio (sin FK a Room, sin bloquear inventario)
// que se puede convertir en una reserva real cuando el cliente lo acepta.

import { prisma } from "@/lib/prisma";
import { format, parseISO, differenceInDays } from "date-fns";
import { QuoteStatus, BookingSource } from "@prisma/client";
import { IVA_RATE } from "@/lib/services/invoice.service";
import { createBooking } from "@/lib/services/booking.service";

async function generateQuoteNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const last = await prisma.quote.findFirst({
    where: { quoteNumber: { startsWith: `PRES-${year}-` } },
    orderBy: { createdAt: "desc" },
  });

  let sequence = 1;
  if (last) {
    sequence = parseInt(last.quoteNumber.split("-")[2]) + 1;
  }

  return `PRES-${year}-${String(sequence).padStart(4, "0")}`;
}

export interface CreateQuoteInput {
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  roomName: string;
  pricePerNight: number;
  checkInDate: string; // ISO
  checkOutDate: string; // ISO
  validUntil: string; // ISO
  notes?: string;
}

export async function createQuote(input: CreateQuoteInput) {
  const checkIn = parseISO(input.checkInDate);
  const checkOut = parseISO(input.checkOutDate);

  if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime()) || checkIn >= checkOut) {
    throw new Error("Fechas inválidas.");
  }

  const nights = differenceInDays(checkOut, checkIn);
  const total = parseFloat((input.pricePerNight * nights).toFixed(2));
  const subtotal = parseFloat((total / (1 + IVA_RATE)).toFixed(2));
  const tax = parseFloat((total - subtotal).toFixed(2));
  const quoteNumber = await generateQuoteNumber();

  return prisma.quote.create({
    data: {
      quoteNumber,
      guestName: input.guestName,
      guestEmail: input.guestEmail,
      guestPhone: input.guestPhone,
      roomName: input.roomName,
      pricePerNight: input.pricePerNight,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      subtotal,
      tax,
      total,
      validUntil: parseISO(input.validUntil),
      notes: input.notes,
    },
  });
}

export async function getAllQuotes() {
  return prisma.quote.findMany({ orderBy: { createdAt: "desc" } });
}

export async function getQuoteById(id: string) {
  return prisma.quote.findUnique({ where: { id } });
}

export async function updateQuoteStatus(id: string, status: QuoteStatus) {
  return prisma.quote.update({ where: { id }, data: { status } });
}

export async function deleteQuote(id: string) {
  return prisma.quote.delete({ where: { id } });
}

export interface ConvertQuoteInput {
  roomId: string;
  adults: number;
  children?: number;
  guest: {
    firstName: string;
    lastName: string;
    documentId: string;
    email: string;
    phone?: string;
    nationality?: string;
  };
}

/**
 * Convierte un presupuesto en una reserva real. Reutiliza createBooking()
 * (hereda el anti-overbooking y el sync a Channex ya construidos).
 */
export async function convertQuoteToBooking(id: string, input: ConvertQuoteInput) {
  const quote = await prisma.quote.findUnique({ where: { id } });
  if (!quote) throw new Error("Presupuesto no encontrado.");
  if (quote.convertedBookingId) {
    throw new Error("Este presupuesto ya se convirtió en una reserva.");
  }

  const booking = await createBooking({
    roomId: input.roomId,
    checkInDate: format(quote.checkInDate, "yyyy-MM-dd"),
    checkOutDate: format(quote.checkOutDate, "yyyy-MM-dd"),
    adults: input.adults,
    children: input.children ?? 0,
    notes: quote.notes ?? undefined,
    source: BookingSource.MANUAL,
    guest: input.guest,
  });

  await prisma.quote.update({
    where: { id },
    data: { status: QuoteStatus.ACCEPTED, convertedBookingId: booking.id },
  });

  return booking;
}
