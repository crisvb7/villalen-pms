// lib/services/guest-message.service.ts
// Chat entre el huésped y recepción, ligado al hilo de su reserva (no hay
// conversaciones separadas de la estancia a la que pertenecen).

import { prisma } from "@/lib/prisma";
import { MessageSender } from "@prisma/client";

// Vista del personal (web y app de staff): historial completo, sin filtrar
// — el chat de una estancia terminada sigue siendo consultable aquí aunque
// ya no lo vea el huésped.
export async function listMessages(bookingId: string) {
  return prisma.guestMessage.findMany({
    where: { bookingId },
    orderBy: { createdAt: "asc" },
  });
}

// Vista del huésped: si la reserva tiene guestChatClearedAt, oculta todo lo
// anterior a esa fecha (lo enviado en la estancia ya terminada) pero sigue
// mostrando mensajes nuevos si el huésped vuelve a escribir después.
export async function listMessagesForGuest(bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { guestChatClearedAt: true },
  });

  return prisma.guestMessage.findMany({
    where: {
      bookingId,
      ...(booking?.guestChatClearedAt ? { createdAt: { gt: booking.guestChatClearedAt } } : {}),
    },
    orderBy: { createdAt: "asc" },
  });
}

// Oculta el chat al huésped a partir de ahora (checkout/cancelación
// automáticos, o botón manual del personal). No borra ningún mensaje.
export async function clearGuestChat(bookingId: string) {
  return prisma.booking.update({
    where: { id: bookingId },
    data: { guestChatClearedAt: new Date() },
  });
}

export async function sendGuestMessage(bookingId: string, body: string) {
  return createMessage(bookingId, MessageSender.GUEST, body);
}

export async function sendStaffMessage(bookingId: string, body: string) {
  return createMessage(bookingId, MessageSender.STAFF, body);
}

async function createMessage(bookingId: string, sender: MessageSender, body: string) {
  const trimmed = body.trim();
  if (!trimmed) throw new Error("El mensaje no puede estar vacío.");
  if (trimmed.length > 2000) throw new Error("El mensaje es demasiado largo.");

  return prisma.guestMessage.create({
    data: { bookingId, sender, body: trimmed },
  });
}

/**
 * Marca como leídos los mensajes del OTRO lado de la conversación — llamar
 * con reader "GUEST" cuando el huésped abre el chat (marca lo enviado por
 * STAFF) y con "STAFF" cuando el personal lo abre desde la web/app (marca
 * lo enviado por GUEST).
 */
export async function markMessagesRead(bookingId: string, reader: MessageSender) {
  const senderToMark = reader === MessageSender.GUEST ? MessageSender.STAFF : MessageSender.GUEST;

  return prisma.guestMessage.updateMany({
    where: { bookingId, sender: senderToMark, readAt: null },
    data: { readAt: new Date() },
  });
}

export async function countUnread(bookingId: string, reader: MessageSender) {
  const senderToCount = reader === MessageSender.GUEST ? MessageSender.STAFF : MessageSender.GUEST;

  return prisma.guestMessage.count({
    where: { bookingId, sender: senderToCount, readAt: null },
  });
}

// Como countUnread(bookingId, "GUEST") pero sin contar lo oculto por
// guestChatClearedAt — para el badge de la app de huéspedes.
export async function countUnreadForGuest(bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { guestChatClearedAt: true },
  });

  return prisma.guestMessage.count({
    where: {
      bookingId,
      sender: MessageSender.STAFF,
      readAt: null,
      ...(booking?.guestChatClearedAt ? { createdAt: { gt: booking.guestChatClearedAt } } : {}),
    },
  });
}

/**
 * Para el listado de reservas del personal: cuántos mensajes sin leer del
 * huésped tiene cada reserva, de un tirón (evita N consultas, una por fila).
 */
export async function countUnreadFromGuestsByBooking(): Promise<Record<string, number>> {
  const groups = await prisma.guestMessage.groupBy({
    by: ["bookingId"],
    where: { sender: MessageSender.GUEST, readAt: null },
    _count: { _all: true },
  });

  return Object.fromEntries(groups.map((g) => [g.bookingId, g._count._all]));
}
