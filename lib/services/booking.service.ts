// lib/services/booking.service.ts
// Capa de servicio para la gestión de Reservas
// Incluye verificación anti-overbooking

import { prisma } from "@/lib/prisma";
import { parseISO, differenceInDays } from "date-fns";
import { BookingStatus, BookingSource } from "@prisma/client";
import { CreateBookingInput } from "@/lib/types";
import { pushAvailabilityAndRates } from "@/lib/services/channex.service";
import { sendEmail } from "@/lib/email/client";
import { BookingConfirmationEmail } from "@/lib/email/templates/BookingConfirmationEmail";
import { BookingCancelledEmail } from "@/lib/email/templates/BookingCancelledEmail";
import { formatDateLong, formatCurrency } from "@/lib/utils";

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
      invoices: { select: { id: true } },
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

  // Si el huésped ya guardó una tarjeta (Stripe) al reservar, la reserva
  // queda confirmada de inmediato en vez de esperar transferencia bancaria.
  // Igual si la da de alta el personal a mano desde el panel (MANUAL): ya
  // saben que es real, no tiene sentido el paso extra de confirmarla después.
  const hasStripeCard = Boolean(input.stripeCustomerId && input.stripePaymentMethodId);
  const isManualStaffEntry = input.source === BookingSource.MANUAL;

  // Crear la reserva
  const booking = await prisma.booking.create({
    data: {
      guestId: guest.id,
      roomId: input.roomId,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      totalAmount,
      status:
        hasStripeCard || isManualStaffEntry
          ? BookingStatus.CONFIRMED
          : BookingStatus.PENDING,
      source: input.source ?? BookingSource.WEB,
      depositPaid: false,
      adults: input.adults,
      children: input.children ?? 0,
      notes: input.notes,
      stripeCustomerId: input.stripeCustomerId,
      stripePaymentMethodId: input.stripePaymentMethodId,
    },
    include: { guest: true, room: true },
  });

  await pushAvailabilityAndRates(booking.roomId, checkIn, checkOut);

  const isConfirmed = hasStripeCard || isManualStaffEntry;
  await sendEmail({
    to: booking.guest.email,
    subject: isConfirmed ? "Tu reserva está confirmada" : "Hemos recibido tu solicitud de reserva",
    react: BookingConfirmationEmail({
      guestFirstName: booking.guest.firstName,
      roomName: booking.room.name,
      checkInDate: formatDateLong(booking.checkInDate),
      checkOutDate: formatDateLong(booking.checkOutDate),
      totalAmount: formatCurrency(booking.totalAmount.toString()),
      status: isConfirmed ? "CONFIRMED" : "PENDING",
      precheckinUrl: `${process.env.NEXTAUTH_URL ?? ""}/precheckin/${booking.id}`,
      bankIban: process.env.HOTEL_BANK_IBAN,
    }),
  });

  return booking;
}

export async function updateBookingStatus(
  id: string,
  status: BookingStatus,
  depositPaid?: boolean
) {
  const booking = await prisma.booking.update({
    where: { id },
    data: {
      status,
      ...(depositPaid !== undefined ? { depositPaid } : {}),
    },
    include: { guest: true, room: true },
  });

  await pushAvailabilityAndRates(booking.roomId, booking.checkInDate, booking.checkOutDate);

  return booking;
}

export async function updateBooking(
  id: string,
  data: Partial<{
    checkInDate: Date;
    checkOutDate: Date;
    roomId: string;
    status: BookingStatus;
    depositPaid: boolean;
    notes: string;
    adults: number;
    children: number;
  }>
) {
  const previous = await prisma.booking.findUnique({
    where: { id },
    include: { room: true, invoices: { select: { id: true } } },
  });
  if (!previous) throw new Error("Reserva no encontrada.");

  const movesDatesOrRoom = Boolean(data.checkInDate || data.checkOutDate || data.roomId);

  if (movesDatesOrRoom && previous.invoices.length > 0) {
    throw new Error(
      "Esta reserva ya tiene una factura asociada; no se pueden cambiar sus fechas o su habitación."
    );
  }

  let recomputedTotal: number | undefined;

  if (movesDatesOrRoom) {
    const checkIn = data.checkInDate ?? previous.checkInDate;
    const checkOut = data.checkOutDate ?? previous.checkOutDate;
    const targetRoomId = data.roomId ?? previous.roomId;

    if (checkIn >= checkOut) {
      throw new Error("La fecha de salida debe ser posterior a la de entrada.");
    }

    // Re-verificar disponibilidad contra la habitación DESTINO (puede ser
    // distinta de la actual si se arrastra a otra columna del calendario).
    const isAvailable = await checkAvailability(targetRoomId, checkIn, checkOut, id);
    if (!isAvailable) {
      throw new Error(
        "Las nuevas fechas u habitación generan un conflicto con otra reserva existente."
      );
    }

    const room = data.roomId
      ? await prisma.room.findUnique({ where: { id: data.roomId } })
      : previous.room;
    if (!room) throw new Error("Habitación no encontrada.");

    const nights = differenceInDays(checkOut, checkIn);
    recomputedTotal = parseFloat((parseFloat(room.basePrice.toString()) * nights).toFixed(2));
  }

  const updated = await prisma.booking.update({
    where: { id },
    data: {
      ...data,
      ...(recomputedTotal !== undefined ? { totalAmount: recomputedTotal } : {}),
    },
    include: { guest: true, room: true },
  });

  const roomChanged = Boolean(data.roomId && data.roomId !== previous.roomId);
  if (roomChanged) {
    // Habitación distinta: liberar el rango antiguo en la de origen y
    // ocupar el nuevo rango en la de destino (son dos habitaciones a la vez
    // en Channex, no se puede resolver con una sola sincronización).
    await pushAvailabilityAndRates(previous.roomId, previous.checkInDate, previous.checkOutDate);
    await pushAvailabilityAndRates(updated.roomId, updated.checkInDate, updated.checkOutDate);
  } else {
    // Misma habitación: sincronizar el rango que cubre tanto las fechas
    // antiguas como las nuevas, por si solo se movió de fecha.
    const syncFrom = previous.checkInDate < updated.checkInDate ? previous.checkInDate : updated.checkInDate;
    const syncTo = previous.checkOutDate > updated.checkOutDate ? previous.checkOutDate : updated.checkOutDate;
    await pushAvailabilityAndRates(updated.roomId, syncFrom, syncTo);
  }

  return updated;
}

export async function cancelBooking(id: string) {
  const booking = await prisma.booking.update({
    where: { id },
    data: { status: BookingStatus.CANCELLED },
    include: { guest: true, room: true },
  });

  await pushAvailabilityAndRates(booking.roomId, booking.checkInDate, booking.checkOutDate);

  await sendEmail({
    to: booking.guest.email,
    subject: "Tu reserva ha sido cancelada",
    react: BookingCancelledEmail({
      guestFirstName: booking.guest.firstName,
      roomName: booking.room.name,
      checkInDate: formatDateLong(booking.checkInDate),
      checkOutDate: formatDateLong(booking.checkOutDate),
    }),
  });

  return booking;
}

export async function deleteBooking(id: string) {
  const booking = await prisma.booking.findUnique({ where: { id } });

  // Eliminar facturas relacionadas primero
  await prisma.invoice.deleteMany({ where: { bookingId: id } });
  const deleted = await prisma.booking.delete({ where: { id } });

  if (booking) {
    await pushAvailabilityAndRates(booking.roomId, booking.checkInDate, booking.checkOutDate);
  }

  return deleted;
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
