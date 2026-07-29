// lib/services/precheckin.service.ts
// El huésped completa/corrige sus propios datos antes de llegar — endpoint
// público (sin sesión), así que solo se expone/permite tocar lo estrictamente
// necesario para su propia reserva.

import { prisma } from "@/lib/prisma";

export async function getBookingForPrecheckin(bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { guest: true, room: { select: { name: true } } },
  });
  if (!booking) return null;

  return {
    id: booking.id,
    checkInDate: booking.checkInDate,
    checkOutDate: booking.checkOutDate,
    status: booking.status,
    precheckinCompletedAt: booking.precheckinCompletedAt,
    room: { name: booking.room.name },
    guest: {
      firstName: booking.guest.firstName,
      lastName: booking.guest.lastName,
      documentId: booking.guest.documentId,
      email: booking.guest.email,
      phone: booking.guest.phone,
      nationality: booking.guest.nationality,
      birthDate: booking.guest.birthDate,
    },
  };
}

export interface PrecheckinInput {
  firstName: string;
  lastName: string;
  documentId: string;
  phone?: string;
  nationality?: string;
  birthDate?: string; // yyyy-MM-dd
}

export async function submitPrecheckin(bookingId: string, input: PrecheckinInput) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) throw new Error("Reserva no encontrada.");
  if (booking.status === "CANCELLED") {
    throw new Error("Esta reserva está cancelada.");
  }

  await prisma.guest.update({
    where: { id: booking.guestId },
    data: {
      firstName: input.firstName,
      lastName: input.lastName,
      documentId: input.documentId,
      phone: input.phone,
      nationality: input.nationality,
      birthDate: input.birthDate ? new Date(input.birthDate) : undefined,
    },
  });

  return prisma.booking.update({
    where: { id: bookingId },
    data: { precheckinCompletedAt: new Date() },
  });
}
