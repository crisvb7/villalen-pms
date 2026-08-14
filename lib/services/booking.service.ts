// lib/services/booking.service.ts
// Capa de servicio para la gestión de Reservas
// Incluye verificación anti-overbooking

import { prisma } from "@/lib/prisma";
import { parseISO, differenceInDays } from "date-fns";
import { BookingStatus, BookingSource, RoomType } from "@prisma/client";
import { CreateBookingInput } from "@/lib/types";
import { pushAvailabilityAndRates } from "@/lib/services/channex.service";
import { sendEmail } from "@/lib/email/client";
import { BookingConfirmationEmail } from "@/lib/email/templates/BookingConfirmationEmail";
import { BookingCancelledEmail } from "@/lib/email/templates/BookingCancelledEmail";
import { formatDateLong, formatCurrency, getRoomDisplayName } from "@/lib/utils";
import { revokeGuestAccessCode } from "@/lib/services/guest-access.service";
import { clearGuestChat } from "@/lib/services/guest-message.service";

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

// Comprueba si queda al menos una habitación del tipo libre para TODO el
// rango [checkIn, checkOut), contando tanto reservas ya asignadas a una
// habitación de ese tipo como reservas web todavía sin asignar de ese tipo.
// Se hace un barrido noche a noche (no un simple conteo de solapes) porque
// un conteo simple rechazaría reservas válidas cuando las reservas
// existentes no coinciden todas en las mismas noches.
export async function checkRoomTypeAvailability(
  type: RoomType,
  checkIn: Date,
  checkOut: Date,
  excludeBookingId?: string
): Promise<boolean> {
  const totalRoomsOfType = await prisma.room.count({ where: { type } });
  if (totalRoomsOfType === 0) return false;

  const overlapping = await prisma.booking.findMany({
    where: {
      id: excludeBookingId ? { not: excludeBookingId } : undefined,
      status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN] },
      OR: [{ roomId: null, roomType: type }, { room: { type } }],
      AND: [
        { checkInDate: { lt: checkOut } },
        { checkOutDate: { gt: checkIn } },
      ],
    },
    select: { checkInDate: true, checkOutDate: true },
  });

  const events = overlapping.flatMap((b) => [
    { date: b.checkInDate.getTime(), delta: 1 },
    { date: b.checkOutDate.getTime(), delta: -1 },
  ]);
  events.sort((a, b) => a.date - b.date || a.delta - b.delta);

  let concurrent = 0;
  for (const e of events) {
    concurrent += e.delta;
    if (concurrent >= totalRoomsOfType) return false;
  }

  return true;
}

// ── CRUD Reservas ─────────────────────────────────────────────────────────

// El hash del código de acceso a la app de huéspedes nunca debe salir hacia
// el navegador del backoffice: aunque es un hash, el código de origen es
// corto (6 dígitos) y crackearlo offline a partir del hash es factible, así
// que el hash solo debe vivir en el servidor (ver guest-access.service.ts).
function omitGuestAccessHash<T extends { guestAccessCodeHash: string | null }>(
  booking: T
): Omit<T, "guestAccessCodeHash"> {
  const { guestAccessCodeHash: _omit, ...rest } = booking;
  return rest;
}

export async function getAllBookings(filters?: {
  status?: BookingStatus;
  from?: Date;
  to?: Date;
}) {
  const bookings = await prisma.booking.findMany({
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
  return bookings.map(omitGuestAccessHash);
}

export async function getBookingById(id: string) {
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      guest: true,
      room: true,
      invoices: true,
    },
  });
  return booking ? omitGuestAccessHash(booking) : null;
}

export async function getPendingRoomAssignmentBookings() {
  return prisma.booking.findMany({
    where: {
      roomId: null,
      status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
    },
    include: { guest: true },
    orderBy: { checkInDate: "asc" },
  });
}

export async function createBooking(input: CreateBookingInput) {
  const checkIn = parseISO(input.checkInDate);
  const checkOut = parseISO(input.checkOutDate);

  if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
    throw new Error("Fechas inválidas.");
  }
  if (checkIn >= checkOut) {
    throw new Error("La fecha de salida debe ser posterior a la de entrada.");
  }
  if (checkIn < new Date(new Date().setHours(0, 0, 0, 0))) {
    throw new Error("No se pueden crear reservas en el pasado.");
  }
  if (!input.roomId && !input.roomType) {
    throw new Error("Debes indicar una habitación (roomId) o un tipo de habitación (roomType).");
  }

  let assignedRoomId: string | undefined;
  let roomType: RoomType;
  let pricePerNight: number;

  if (input.roomId) {
    const room = await prisma.room.findUnique({ where: { id: input.roomId } });
    if (!room) throw new Error("Habitación no encontrada.");

    const isAvailable = await checkAvailability(input.roomId, checkIn, checkOut);
    if (!isAvailable) {
      throw new Error(
        "La habitación no está disponible para las fechas seleccionadas. Por favor, elige otras fechas."
      );
    }
    assignedRoomId = room.id;
    roomType = room.type;
    pricePerNight = parseFloat(room.basePrice.toString());
  } else {
    roomType = input.roomType!;
    const isAvailable = await checkRoomTypeAvailability(roomType, checkIn, checkOut);
    if (!isAvailable) {
      throw new Error(
        "No quedan habitaciones de ese tipo disponibles para las fechas seleccionadas. Por favor, elige otras fechas."
      );
    }
    const reference = await prisma.room.findFirst({
      where: { type: roomType, capacity: { gte: input.adults + (input.children ?? 0) } },
      orderBy: { basePrice: "asc" },
    });
    if (!reference) throw new Error("No hay habitaciones configuradas de ese tipo.");
    pricePerNight = parseFloat(reference.basePrice.toString());
  }

  const nights = differenceInDays(checkOut, checkIn);
  const totalAmount = parseFloat((pricePerNight * nights).toFixed(2));

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
    guest = await prisma.guest.update({
      where: { id: guest.id },
      data: {
        email: input.guest.email,
        phone: input.guest.phone ?? guest.phone,
      },
    });
  }

  const hasStripeCard = Boolean(input.stripeCustomerId && input.stripePaymentMethodId);
  const isManualStaffEntry = input.source === BookingSource.MANUAL;

  const booking = await prisma.booking.create({
    data: {
      guestId: guest.id,
      roomId: assignedRoomId,
      roomType,
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

  if (booking.roomId) {
    await pushAvailabilityAndRates(booking.roomId, checkIn, checkOut);
  }

  const isConfirmed = hasStripeCard || isManualStaffEntry;
  await sendEmail({
    to: booking.guest.email,
    subject: isConfirmed ? "Tu reserva está confirmada" : "Hemos recibido tu solicitud de reserva",
    react: BookingConfirmationEmail({
      guestFirstName: booking.guest.firstName,
      roomName: getRoomDisplayName(booking),
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

  if (booking.roomId) {
    await pushAvailabilityAndRates(booking.roomId, booking.checkInDate, booking.checkOutDate);
  }

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

    const targetRoom = data.roomId
      ? await prisma.room.findUnique({ where: { id: data.roomId } })
      : previous.room;

    if (data.roomId) {
      if (!targetRoom) throw new Error("Habitación no encontrada.");
      if (targetRoom.type !== previous.roomType) {
        throw new Error("La habitación elegida no es del tipo reservado.");
      }
    }

    if (targetRoomId && targetRoom) {
      const isAvailable = await checkAvailability(targetRoomId, checkIn, checkOut, id);
      if (!isAvailable) {
        throw new Error(
          "Las nuevas fechas u habitación generan un conflicto con otra reserva existente."
        );
      }

      const nights = differenceInDays(checkOut, checkIn);
      recomputedTotal = parseFloat((parseFloat(targetRoom.basePrice.toString()) * nights).toFixed(2));
    } else if (!targetRoomId) {
      const isAvailable = await checkRoomTypeAvailability(previous.roomType, checkIn, checkOut, id);
      if (!isAvailable) {
        throw new Error(
          "No quedan habitaciones de ese tipo disponibles para las fechas seleccionadas. Por favor, elige otras fechas."
        );
      }
    }
  }

  const updated = await prisma.booking.update({
    where: { id },
    data: {
      ...data,
      ...(recomputedTotal !== undefined ? { totalAmount: recomputedTotal } : {}),
    },
    include: { guest: true, room: true },
  });

  const endsStay =
    data.status &&
    data.status !== previous.status &&
    (data.status === BookingStatus.CHECKED_OUT || data.status === BookingStatus.CANCELLED);
  if (endsStay) {
    // Best-effort: si falla, no debe tumbar la actualización de la reserva
    // (el personal siempre puede revocar el acceso / ocultar el chat a mano
    // después).
    await revokeGuestAccessCode(id).catch((err) =>
      console.error("[updateBooking] No se pudo revocar el acceso de huésped", err)
    );
    await clearGuestChat(id).catch((err) =>
      console.error("[updateBooking] No se pudo ocultar el chat de huésped", err)
    );
  }

  const roomChanged = Boolean(data.roomId && data.roomId !== previous.roomId);
  if (roomChanged) {
    if (previous.roomId) {
      await pushAvailabilityAndRates(previous.roomId, previous.checkInDate, previous.checkOutDate);
    }
    if (updated.roomId) {
      await pushAvailabilityAndRates(updated.roomId, updated.checkInDate, updated.checkOutDate);
    }
  } else if (updated.roomId) {
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

  if (booking.roomId) {
    await pushAvailabilityAndRates(booking.roomId, booking.checkInDate, booking.checkOutDate);
  }

  await sendEmail({
    to: booking.guest.email,
    subject: "Tu reserva ha sido cancelada",
    react: BookingCancelledEmail({
      guestFirstName: booking.guest.firstName,
      roomName: getRoomDisplayName(booking),
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

  if (booking?.roomId) {
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
