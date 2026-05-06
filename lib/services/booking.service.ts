// lib/services/booking.service.ts
// Capa de servicio para la gestión de Reservas
// Incluye verificación anti-overbooking

import { prisma } from "@/lib/prisma";
import { parseISO, differenceInDays } from "date-fns";
import { BookingStatus, BookingSource } from "@prisma/client";
import { CreateBookingInput } from "@/lib/types";

// ── Anti-Overbooking ──────────────────────────────────────────────────────

export async function checkAvailability(
  roomId: string,
  checkInDate: Date,
  checkOutDate: Date,
  excludeBookingId?: string
): Promise<boolean> {
  const conflictingBooking = await prisma.booking.findFirst({
    where: {
      roomId,
      id: excludeBookingId ? { not: excludeBookingId } : undefined,
      status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN] },
      AND: [
        { checkInDate: { lt: checkOutDate } },
        { checkOutDate: { gt: checkInDate } },
      ],
    },
  });

  return conflictingBooking === null; // true = disponible
}

// ── CRUD Reservas ─────────────────────────────────────────────────────────

export async function getAllBookings(filters?: {
  status?: BookingStatus;
  from?: Date;
  to?: Date;
}) {
  return prisma.booking.findMany({
    where: {
      status: filters?.status,
      checkInDate: filters?.from ? { gte: filters.from } : undefined,
    },
    include: {
      guest: true,
      room: true,
    },
    orderBy: { checkInDate: "asc" },
  });
}

export async function getBookingById(id: string) {
  return prisma.booking.findUnique({
    where: { id },
    include: {
      guest: true,
      room: true,
      invoices: true,
    },
  });
}

export async function createBooking(input: CreateBookingInput) {
  const checkIn = parseISO(input.checkInDate);
  const checkOut = parseISO(input.checkOutDate);

  // Validación de fechas
  if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
    throw new Error("Fechas inválidas.");
  }
  if (checkIn >= checkOut) {
    throw new Error("La fecha de salida debe ser posterior a la de entrada.");
  }
  if (checkIn < new Date(new Date().setHours(0, 0, 0, 0))) {
    throw new Error("No se pueden crear reservas en el pasado.");
  }

  // Verificar que la habitación existe
  const room = await prisma.room.findUnique({ where: { id: input.roomId } });
  if (!room) throw new Error("Habitación no encontrada.");

  // ⚠️ Verificación anti-overbooking
  const isAvailable = await checkAvailability(input.roomId, checkIn, checkOut);
  if (!isAvailable) {
    throw new Error(
      "La habitación no está disponible para las fechas seleccionadas. Por favor, elige otras fechas."
    );
  }

  // Calcular importe total
  const nights = differenceInDays(checkOut, checkIn);
  const totalAmount = parseFloat((parseFloat(room.basePrice.toString()) * nights).toFixed(2));

  // Buscar huésped existente por documentId o crear uno nuevo
  let guest = await prisma.guest.findFirst({
    where: { documentId: input.guest.documentId },
  });

  if (!guest) {
    guest = await prisma.guest.create({
      data: {
        firstName: input.guest.firstName,
        lastName: input.guest.lastName,
        documentId: input.guest.documentId,
        email: input.guest.email,
        phone: input.guest.phone,
        nationality: input.guest.nationality ?? "ES",
      },
    });
  } else {
    // Actualizar datos de contacto si cambiaron
    guest = await prisma.guest.update({
      where: { id: guest.id },
      data: {
        email: input.guest.email,
        phone: input.guest.phone ?? guest.phone,
      },
    });
  }

  // Crear la reserva
  const booking = await prisma.booking.create({
    data: {
      guestId: guest.id,
      roomId: input.roomId,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      totalAmount,
      status: BookingStatus.PENDING,
      source: input.source ?? BookingSource.WEB,
      depositPaid: false,
      adults: input.adults,
      children: input.children ?? 0,
      notes: input.notes,
    },
    include: { guest: true, room: true },
  });

  return booking;
}

export async function updateBookingStatus(
  id: string,
  status: BookingStatus,
  depositPaid?: boolean
) {
  return prisma.booking.update({
    where: { id },
    data: {
      status,
      ...(depositPaid !== undefined ? { depositPaid } : {}),
    },
    include: { guest: true, room: true },
  });
}

export async function updateBooking(
  id: string,
  data: Partial<{
    checkInDate: Date;
    checkOutDate: Date;
    status: BookingStatus;
    depositPaid: boolean;
    notes: string;
    adults: number;
    children: number;
  }>
) {
  // Si se cambian fechas, re-verificar disponibilidad
  if (data.checkInDate || data.checkOutDate) {
    const current = await prisma.booking.findUnique({ where: { id } });
    if (!current) throw new Error("Reserva no encontrada.");

    const checkIn = data.checkInDate ?? current.checkInDate;
    const checkOut = data.checkOutDate ?? current.checkOutDate;

    const isAvailable = await checkAvailability(
      current.roomId,
      checkIn,
      checkOut,
      id // excluir la reserva actual del check
    );
    if (!isAvailable) {
      throw new Error(
        "Las nuevas fechas generan un conflicto con otra reserva existente."
      );
    }
  }

  return prisma.booking.update({
    where: { id },
    data,
    include: { guest: true, room: true },
  });
}

export async function cancelBooking(id: string) {
  return prisma.booking.update({
    where: { id },
    data: { status: BookingStatus.CANCELLED },
    include: { guest: true, room: true },
  });
}

export async function deleteBooking(id: string) {
  // Eliminar facturas relacionadas primero
  await prisma.invoice.deleteMany({ where: { bookingId: id } });
  return prisma.booking.delete({ where: { id } });
}

// ── Reservas próximas (Dashboard) ─────────────────────────────────────────

export async function getUpcomingBookings(days = 7) {
  const today = new Date();
  const future = new Date();
  future.setDate(today.getDate() + days);

  return prisma.booking.findMany({
    where: {
      checkInDate: { gte: today, lte: future },
      status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
    },
    include: { guest: true, room: true },
    orderBy: { checkInDate: "asc" },
  });
}

// ── Ocupación actual ──────────────────────────────────────────────────────

export async function getCurrentOccupancy() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  return prisma.booking.findMany({
    where: {
      checkInDate: { lte: today },
      checkOutDate: { gt: today },
      status: { in: [BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN] },
    },
    include: { guest: true, room: true },
  });
}
