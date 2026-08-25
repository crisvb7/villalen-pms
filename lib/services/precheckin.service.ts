// lib/services/precheckin.service.ts
// El huésped completa/corrige sus propios datos antes de llegar — endpoint
// público (sin sesión), así que solo se expone/permite tocar lo estrictamente
// necesario para su propia reserva.

import { prisma } from "@/lib/prisma";
import { GuestSex } from "@prisma/client";
import { detectDocumentType } from "@/lib/utils";

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
    roomType: booking.roomType,
    room: booking.room ? { name: booking.room.name } : null,
    guest: {
      firstName: booking.guest.firstName,
      lastName: booking.guest.lastName,
      secondLastName: booking.guest.secondLastName,
      documentId: booking.guest.documentId,
      documentSupportNumber: booking.guest.documentSupportNumber,
      email: booking.guest.email,
      phone: booking.guest.phone,
      nationality: booking.guest.nationality,
      birthDate: booking.guest.birthDate,
      sex: booking.guest.sex,
      addressStreet: booking.guest.addressStreet,
      addressCity: booking.guest.addressCity,
      addressPostalCode: booking.guest.addressPostalCode,
      addressProvince: booking.guest.addressProvince,
      addressCountry: booking.guest.addressCountry,
    },
  };
}

// Campos exigidos por el parte de viajeros (SES.HOSPEDAJES / RD 933/2021)
// para el titular de la reserva. El número de soporte solo aplica a
// documentos españoles (DNI/NIE) — para pasaporte no existe ese campo.
export interface PrecheckinInput {
  firstName: string;
  lastName: string;
  secondLastName?: string;
  documentId: string;
  documentSupportNumber?: string;
  phone?: string;
  nationality?: string;
  birthDate?: string; // yyyy-MM-dd
  sex?: GuestSex;
  addressStreet?: string;
  addressCity?: string;
  addressPostalCode?: string;
  addressProvince?: string;
  addressCountry?: string;
}

export async function submitPrecheckin(bookingId: string, input: PrecheckinInput) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) throw new Error("Reserva no encontrada.");
  if (booking.status === "CANCELLED") {
    throw new Error("Esta reserva está cancelada.");
  }

  const documentType = detectDocumentType(input.documentId);
  if ((documentType === "DNI" || documentType === "NIE") && !input.documentSupportNumber?.trim()) {
    throw new Error("El número de soporte del documento es obligatorio para DNI/NIE.");
  }

  await prisma.guest.update({
    where: { id: booking.guestId },
    data: {
      firstName: input.firstName,
      lastName: input.lastName,
      secondLastName: input.secondLastName,
      documentId: input.documentId,
      documentSupportNumber:
        documentType === "DNI" || documentType === "NIE" ? input.documentSupportNumber : null,
      phone: input.phone,
      nationality: input.nationality,
      birthDate: input.birthDate ? new Date(input.birthDate) : undefined,
      sex: input.sex,
      addressStreet: input.addressStreet,
      addressCity: input.addressCity,
      addressPostalCode: input.addressPostalCode,
      addressProvince: input.addressProvince,
      addressCountry: input.addressCountry,
    },
  });

  return prisma.booking.update({
    where: { id: bookingId },
    data: { precheckinCompletedAt: new Date() },
  });
}
