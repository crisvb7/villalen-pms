// lib/services/booking-traveler.service.ts
// Acompañantes de una reserva (además del titular) — el parte de viajeros
// exige reportar a todos los huéspedes mayores de 14 años, no solo al
// titular que figura en `Guest`. Mismo nivel de exposición que
// precheckin.service.ts: se usa tanto desde el endpoint público de
// precheckin (el huésped añade a sus acompañantes) como desde el admin.

import { prisma } from "@/lib/prisma";
import { GuestSex } from "@prisma/client";
import { detectDocumentType } from "@/lib/utils";

export interface BookingTravelerInput {
  firstName: string;
  lastName: string;
  secondLastName?: string;
  documentId?: string;
  documentSupportNumber?: string;
  nationality?: string;
  birthDate?: string; // yyyy-MM-dd
  sex?: GuestSex;
  addressStreet?: string;
  addressCity?: string;
  addressMunicipalityCode?: string;
  addressPostalCode?: string;
  addressProvince?: string;
  addressCountry?: string;
  phone?: string;
  email?: string;
  relationshipToLead?: string;
}

export async function listBookingTravelers(bookingId: string) {
  return prisma.bookingTraveler.findMany({
    where: { bookingId },
    orderBy: { createdAt: "asc" },
  });
}

function validate(input: BookingTravelerInput) {
  if (!input.firstName?.trim() || !input.lastName?.trim()) {
    throw new Error("Nombre y primer apellido son obligatorios.");
  }
  if (input.documentId) {
    const documentType = detectDocumentType(input.documentId);
    if ((documentType === "DNI" || documentType === "NIE") && !input.documentSupportNumber?.trim()) {
      throw new Error("El número de soporte del documento es obligatorio para DNI/NIE.");
    }
  }
}

export async function addBookingTraveler(bookingId: string, input: BookingTravelerInput) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) throw new Error("Reserva no encontrada.");
  if (booking.status === "CANCELLED") throw new Error("Esta reserva está cancelada.");

  validate(input);

  return prisma.bookingTraveler.create({
    data: {
      bookingId,
      firstName: input.firstName,
      lastName: input.lastName,
      secondLastName: input.secondLastName,
      documentId: input.documentId,
      documentSupportNumber: input.documentSupportNumber,
      nationality: input.nationality,
      birthDate: input.birthDate ? new Date(input.birthDate) : undefined,
      sex: input.sex,
      addressStreet: input.addressStreet,
      addressCity: input.addressCity,
      addressMunicipalityCode: input.addressMunicipalityCode,
      addressPostalCode: input.addressPostalCode,
      addressProvince: input.addressProvince,
      addressCountry: input.addressCountry,
      phone: input.phone,
      email: input.email,
      relationshipToLead: input.relationshipToLead,
    },
  });
}

export async function updateBookingTraveler(
  bookingId: string,
  travelerId: string,
  input: BookingTravelerInput
) {
  const existing = await prisma.bookingTraveler.findUnique({ where: { id: travelerId } });
  if (!existing || existing.bookingId !== bookingId) throw new Error("Acompañante no encontrado.");

  validate(input);

  return prisma.bookingTraveler.update({
    where: { id: travelerId },
    data: {
      firstName: input.firstName,
      lastName: input.lastName,
      secondLastName: input.secondLastName,
      documentId: input.documentId,
      documentSupportNumber: input.documentSupportNumber,
      nationality: input.nationality,
      birthDate: input.birthDate ? new Date(input.birthDate) : undefined,
      sex: input.sex,
      addressStreet: input.addressStreet,
      addressCity: input.addressCity,
      addressMunicipalityCode: input.addressMunicipalityCode,
      addressPostalCode: input.addressPostalCode,
      addressProvince: input.addressProvince,
      addressCountry: input.addressCountry,
      phone: input.phone,
      email: input.email,
      relationshipToLead: input.relationshipToLead,
    },
  });
}

export async function removeBookingTraveler(bookingId: string, travelerId: string) {
  const existing = await prisma.bookingTraveler.findUnique({ where: { id: travelerId } });
  if (!existing || existing.bookingId !== bookingId) throw new Error("Acompañante no encontrado.");
  await prisma.bookingTraveler.delete({ where: { id: travelerId } });
}
