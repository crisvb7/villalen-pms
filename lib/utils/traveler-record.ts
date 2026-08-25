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
    },
  });

  if (!booking) {
    throw new Error(`Reserva no encontrada: ${bookingId}`);
  }

  const { guest, room } = booking;
  const documentType = detectDocumentType(guest.documentId);

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
    <Viajero>
      <!--
        NOTA: En producción se incluirían TODOS los viajeros mayores de 14 años.
        Este sistema solo gestiona el titular de la reserva.
        Los datos adicionales de acompañantes deben recogerse en check-in.
      -->
      <Nombre>${escapeXml(guest.firstName)}</Nombre>
      <Apellido1>${escapeXml(guest.lastName)}</Apellido1>
      ${guest.secondLastName
        ? `<Apellido2>${escapeXml(guest.secondLastName)}</Apellido2>`
        : "<!-- Apellido2: no aportado (opcional) -->"}
      <TipoDocumento>${documentType}</TipoDocumento>
      <NumeroDocumento>${escapeXml(guest.documentId)}</NumeroDocumento>
      ${guest.documentSupportNumber
        ? `<SoporteDocumento>${escapeXml(guest.documentSupportNumber)}</SoporteDocumento>`
        : "<!-- SoporteDocumento: no disponible - recoger en check-in (obligatorio para DNI/NIE) -->"}
      <Nacionalidad>${escapeXml(guest.nationality ?? "ESP")}</Nacionalidad>
      ${guest.birthDate
        ? `<FechaNacimiento>${format(guest.birthDate, "yyyy-MM-dd")}</FechaNacimiento>`
        : "<!-- FechaNacimiento: No disponible - recoger en check-in -->"}
      ${guest.sex ? `<Sexo>${guest.sex}</Sexo>` : "<!-- Sexo: no disponible - recoger en check-in -->"}
      <Telefono>${escapeXml(guest.phone ?? "")}</Telefono>
      <Email>${escapeXml(guest.email)}</Email>
      <Direccion>
        <Via>${escapeXml(guest.addressStreet ?? "")}</Via>
        <Municipio>${escapeXml(guest.addressCity ?? "")}</Municipio>
        <CodigoPostal>${escapeXml(guest.addressPostalCode ?? "")}</CodigoPostal>
        ${guest.addressProvince ? `<Provincia>${escapeXml(guest.addressProvince)}</Provincia>` : ""}
        <Pais>${escapeXml(guest.addressCountry ?? "ESP")}</Pais>
      </Direccion>
    </Viajero>
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
