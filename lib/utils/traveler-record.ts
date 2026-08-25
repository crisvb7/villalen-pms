// lib/utils/traveler-record.ts
// Generador de Fichas de Viajero para Hospederías
// ================================================
// Simula la estructura del parte de viajeros exigido por el
// Ministerio del Interior (Guardia Civil / Policía Nacional)
// según el Real Decreto 933/2021.

import { prisma } from "@/lib/prisma";
import { formatDate, detectDocumentType, ROOM_TYPE_LABELS } from "@/lib/utils";
import { format } from "date-fns";
import { ESTABLISHMENT } from "@/lib/establishment";

/**
 * Genera la ficha de viajero en formato XML para una reserva concreta.
 * Compatible con la estructura del Sistema SES (Hospederías).
 *
 * @param bookingId - ID de la reserva en base de datos
 * @returns XML string con la ficha del viajero
 */
export async function generateTravelerRecordXML(
  bookingId: string
): Promise<string> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      guest: true,
      room: true,
      travelers: true,
    },
  });

  if (!booking) {
    throw new Error(`Reserva no encontrada: ${bookingId}`);
  }

  const { guest, room, travelers } = booking;
  const documentType = detectDocumentType(guest.documentId);

  const viajeroXml = (
    p: {
      firstName: string;
      lastName: string;
      secondLastName: string | null;
      documentId: string | null;
      documentSupportNumber: string | null;
      nationality: string | null;
      birthDate: Date | null;
      sex: string | null;
      phone: string | null;
      email: string | null;
      addressStreet: string | null;
      addressCity: string | null;
      addressPostalCode: string | null;
      addressProvince: string | null;
      addressCountry: string | null;
      relationshipToLead?: string | null;
    }
  ) => `<Viajero>
      <Nombre>${escapeXml(p.firstName)}</Nombre>
      <Apellido1>${escapeXml(p.lastName)}</Apellido1>
      ${p.secondLastName ? `<Apellido2>${escapeXml(p.secondLastName)}</Apellido2>` : ""}
      ${p.documentId
        ? `<TipoDocumento>${detectDocumentType(p.documentId)}</TipoDocumento>
      <NumeroDocumento>${escapeXml(p.documentId)}</NumeroDocumento>
      ${p.documentSupportNumber ? `<SoporteDocumento>${escapeXml(p.documentSupportNumber)}</SoporteDocumento>` : ""}`
        : "<!-- Sin documento propio (menor de edad) -->"}
      <Nacionalidad>${escapeXml(p.nationality ?? "ESP")}</Nacionalidad>
      ${p.birthDate ? `<FechaNacimiento>${format(p.birthDate, "yyyy-MM-dd")}</FechaNacimiento>` : ""}
      ${p.sex ? `<Sexo>${p.sex}</Sexo>` : ""}
      <Telefono>${escapeXml(p.phone ?? "")}</Telefono>
      <Email>${escapeXml(p.email ?? "")}</Email>
      <Direccion>
        <Via>${escapeXml(p.addressStreet ?? "")}</Via>
        <Municipio>${escapeXml(p.addressCity ?? "")}</Municipio>
        <CodigoPostal>${escapeXml(p.addressPostalCode ?? "")}</CodigoPostal>
        ${p.addressProvince ? `<Provincia>${escapeXml(p.addressProvince)}</Provincia>` : ""}
        <Pais>${escapeXml(p.addressCountry ?? "ESP")}</Pais>
      </Direccion>
      ${p.relationshipToLead ? `<Parentesco>${escapeXml(p.relationshipToLead)}</Parentesco>` : ""}
    </Viajero>`;

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!--
  PARTE DE ENTRADA DE VIAJEROS - HOSPEDERÍAS
  Ministerio del Interior - Guardia Civil / Policía Nacional
  Real Decreto 933/2021, de 26 de octubre
  
  Sistema de Gestión: Villalén PMS
  Generado: ${format(new Date(), "yyyy-MM-dd'T'HH:mm:ss")}
  
  NOTA: Este es un fichero simulado para desarrollo.
  En producción, se enviaría cifrado al sistema SES del MNPR.
-->
<PartesViajeros xmlns="http://www.interior.gob.es/SES/hospederias/v2"
                xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                xsi:schemaLocation="http://www.interior.gob.es/SES/hospederias/v2 hospederia_v2.xsd">

  <Establecimiento>
    <Nombre>${escapeXml(ESTABLISHMENT.name)}</Nombre>
    <CIF>${escapeXml(ESTABLISHMENT.cif)}</CIF>
    <Direccion>${escapeXml(ESTABLISHMENT.address)}</Direccion>
    <Municipio>${escapeXml(ESTABLISHMENT.municipality)}</Municipio>
    <Provincia>${escapeXml(ESTABLISHMENT.province)}</Provincia>
    <ComunidadAutonoma>${escapeXml(ESTABLISHMENT.autonomousCommunity)}</ComunidadAutonoma>
    <NumeroRegistroTuristico>${escapeXml(ESTABLISHMENT.registrationNumber)}</NumeroRegistroTuristico>
  </Establecimiento>

  <Reserva>
    <Identificador>${escapeXml(bookingId)}</Identificador>
    <FechaEntrada>${format(booking.checkInDate, "yyyy-MM-dd")}</FechaEntrada>
    <FechaSalida>${format(booking.checkOutDate, "yyyy-MM-dd")}</FechaSalida>
    <NumeroHabitacion>${escapeXml(room?.name ?? ROOM_TYPE_LABELS[booking.roomType])}</NumeroHabitacion>
    <NumeroAdultos>${booking.adults}</NumeroAdultos>
    <NumeroMenores>${booking.children}</NumeroMenores>
    <Canal>${escapeXml(booking.source)}</Canal>
  </Reserva>

  <Viajeros>
    ${viajeroXml(guest)}
    ${travelers.map(viajeroXml).join("\n    ")}
  </Viajeros>

</PartesViajeros>`;

  // En desarrollo: mostrar en consola
  console.log("\n" + "═".repeat(60));
  console.log("📋 FICHA DE VIAJERO GENERADA");
  console.log("═".repeat(60));
  console.log(`📌 Reserva:  ${bookingId}`);
  console.log(`👤 Titular:  ${guest.firstName} ${guest.lastName}`);
  console.log(`🪪  Documento: ${documentType} - ${guest.documentId}`);
  console.log(`🏠 Habitación: ${room?.name ?? ROOM_TYPE_LABELS[booking.roomType]}`);
  console.log(
    `📅 Estancia: ${formatDate(booking.checkInDate)} → ${formatDate(booking.checkOutDate)}`
  );
  console.log("═".repeat(60));
  console.log("XML:\n");
  console.log(xml);
  console.log("═".repeat(60) + "\n");

  return xml;
}

/**
 * Escapa caracteres especiales para XML
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Genera fichas para todas las llegadas de un día concreto (batch)
 */
export async function generateDailyArrivalsXML(date: Date): Promise<string> {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const bookings = await prisma.booking.findMany({
    where: {
      checkInDate: { gte: startOfDay, lte: endOfDay },
      status: { in: ["CONFIRMED", "CHECKED_IN"] },
    },
    include: { guest: true, room: true },
  });

  console.log(
    `\n📋 Generando ${bookings.length} fichas para ${formatDate(date)}...`
  );

  const xmlParts = await Promise.all(
    bookings.map((b) => generateTravelerRecordXML(b.id))
  );

  return xmlParts.join("\n\n<!-- ═══════════════════════════════ -->\n\n");
}
