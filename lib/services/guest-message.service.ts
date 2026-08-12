// lib/services/guest-message.service.ts
// Chat entre el huésped y recepción, ligado al hilo de su reserva (no hay
// conversaciones separadas de la estancia a la que pertenecen).

import { prisma } from "@/lib/prisma";
import { MessageSender } from "@prisma/client";

export async function listMessages(bookingId: string) {
  return prisma.guestMessage.findMany({
    where: { bookingId },
    orderBy: { createdAt: "asc" },
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
