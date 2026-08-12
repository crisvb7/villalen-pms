// lib/services/guest-access.service.ts
// Capa de servicio para el acceso de huéspedes a su reserva desde la app.
// El código se genera desde la web de administración o desde la app de
// staff (misma base de datos, cualquiera de las dos vale) y se entrega al
// huésped en persona o por email — nunca se guarda en claro, solo su hash.

import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getRoomDisplayName } from "@/lib/utils";
import type { Booking, Room } from "@prisma/client";

const CODE_LENGTH = 6;

export type BookingWithRoom = Booking & { room: Room | null };

function generatePlainCode(): string {
  const min = 10 ** (CODE_LENGTH - 1);
  const max = 10 ** CODE_LENGTH - 1;
  return String(crypto.randomInt(min, max + 1));
}

/**
 * Genera (o regenera) el código de acceso de una reserva. Regenerar resetea
 * el nombre de cortesía del huésped: la próxima vez que alguien entre con
 * el código nuevo, la app volverá a preguntar "¿cómo te llamamos?", igual
 * que si fuera una estancia distinta (que normalmente lo es).
 *
 * El código en claro solo se devuelve aquí — a partir de este momento solo
 * existe su hash en la base de datos.
 */
export async function generateGuestAccessCode(bookingId: string): Promise<{
  code: string;
  booking: BookingWithRoom;
}> {
  const code = generatePlainCode();
  const guestAccessCodeHash = await bcrypt.hash(code, 10);

  const booking = await prisma.booking.update({
    where: { id: bookingId },
    data: {
      guestAccessCodeHash,
      guestAccessCodeSetAt: new Date(),
      guestDisplayName: null,
      guestLastLoginAt: null,
    },
    include: { room: true },
  });

  return { code, booking };
}

/**
 * Revoca el acceso a la app sin generar un código nuevo (p. ej. al
 * cancelar una reserva). El huésped no podrá volver a entrar hasta que se
 * le genere un código nuevo.
 */
export async function revokeGuestAccessCode(bookingId: string) {
  return prisma.booking.update({
    where: { id: bookingId },
    data: {
      guestAccessCodeHash: null,
      guestAccessCodeSetAt: null,
      guestDisplayName: null,
    },
  });
}

/**
 * Comprueba un código introducido en la app contra las reservas que
 * actualmente tienen un código de acceso activo. El número de candidatas es
 * pequeño (una casa de aldea, no una cadena hotelera), así que comparar una
 * a una con bcrypt es correcto y evita tener que guardar el código en claro
 * en algún índice de búsqueda rápida.
 */
export async function findBookingByGuestAccessCode(code: string): Promise<BookingWithRoom | null> {
  const candidates = await prisma.booking.findMany({
    where: { guestAccessCodeHash: { not: null } },
    include: { room: true },
  });

  for (const booking of candidates) {
    if (
      booking.guestAccessCodeHash &&
      (await bcrypt.compare(code, booking.guestAccessCodeHash))
    ) {
      return booking;
    }
  }

  return null;
}

export async function setGuestDisplayName(bookingId: string, name: string): Promise<BookingWithRoom> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("El nombre no puede estar vacío.");
  }
  if (trimmed.length > 60) {
    throw new Error("El nombre es demasiado largo.");
  }

  return prisma.booking.update({
    where: { id: bookingId },
    data: { guestDisplayName: trimmed },
    include: { room: true },
  });
}

export async function getBookingWithRoom(bookingId: string): Promise<BookingWithRoom | null> {
  return prisma.booking.findUnique({ where: { id: bookingId }, include: { room: true } });
}

export async function recordGuestLogin(bookingId: string): Promise<BookingWithRoom> {
  return prisma.booking.update({
    where: { id: bookingId },
    data: { guestLastLoginAt: new Date() },
    include: { room: true },
  });
}

// Forma que ve la app de huéspedes — nunca exponemos guestAccessCodeHash,
// datos de Stripe, ni nada de la ficha policial/SES.
export function serializeGuestBooking(booking: BookingWithRoom) {
  return {
    id: booking.id,
    roomName: getRoomDisplayName(booking),
    checkInDate: booking.checkInDate,
    checkOutDate: booking.checkOutDate,
    adults: booking.adults,
    children: booking.children,
    guestDisplayName: booking.guestDisplayName,
    needsName: !booking.guestDisplayName,
  };
}
