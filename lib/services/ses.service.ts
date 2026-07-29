// lib/services/ses.service.ts
// Ficha Policial — comunicación real a SES.HOSPEDAJES (Ministerio del Interior),
// obligatoria por el RD 933/2021. Endpoints y autenticación confirmados por
// documentación pública:
//   - Test:       https://hospedajes.pre-ses.mir.es/hospedajes-web/ws/v1/comunicacion
//   - Producción: https://hospedajes.ses.mir.es/hospedajes-web/ws/v1/comunicacion
//   - Auth: HTTP Basic (usuario/contraseña del "Servicio Web", distintos de
//     los del portal) sobre TLS.
//
// ⚠️ IMPORTANTE: no fue posible descargar el WSDL real (el endpoint exige
// certificado/credenciales incluso para servir el contrato) así que el sobre
// SOAP de abajo es un ANDAMIAJE con los campos que exige el RD 933/2021,
// NO una estructura verificada contra Interior. Antes de usar esto en
// producción: solicitar el manual técnico/WSDL al Ministerio del Interior al
// activar el Servicio Web, probar contra el entorno de test
// (pre-ses.mir.es) con las credenciales reales, y ajustar los nombres de
// elemento/operación de este envelope si difieren.

import { prisma } from "@/lib/prisma";
import { ESTABLISHMENT } from "@/lib/establishment";
import { detectDocumentType, formatDate } from "@/lib/utils";

const ENDPOINTS = {
  test: "https://hospedajes.pre-ses.mir.es/hospedajes-web/ws/v1/comunicacion",
  production: "https://hospedajes.ses.mir.es/hospedajes-web/ws/v1/comunicacion",
};

function getConfig() {
  const username = process.env.SES_WS_USERNAME;
  const password = process.env.SES_WS_PASSWORD;
  if (!username || !password) return null;

  const env = process.env.SES_ENVIRONMENT === "production" ? "production" : "test";
  return { username, password, endpoint: ENDPOINTS[env] };
}

export function isSesConfigured(): boolean {
  return getConfig() !== null;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildSoapEnvelope(booking: {
  id: string;
  checkInDate: Date;
  checkOutDate: Date;
  guest: {
    firstName: string;
    lastName: string;
    documentId: string;
    nationality: string | null;
    birthDate: Date | null;
    phone: string | null;
    email: string;
  };
}): string {
  const documentType = detectDocumentType(booking.guest.documentId);

  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                   xmlns:ses="http://www.interior.gob.es/SES/hospederias/v2">
  <soapenv:Header/>
  <soapenv:Body>
    <ses:comunicacionRequest>
      <ses:establecimiento>
        <ses:codigo>${escapeXml(ESTABLISHMENT.registrationNumber)}</ses:codigo>
        <ses:nombre>${escapeXml(ESTABLISHMENT.name)}</ses:nombre>
      </ses:establecimiento>
      <ses:parteEntrada>
        <ses:referencia>${escapeXml(booking.id)}</ses:referencia>
        <ses:fechaEntrada>${formatDate(booking.checkInDate, "yyyy-MM-dd")}</ses:fechaEntrada>
        <ses:fechaSalida>${formatDate(booking.checkOutDate, "yyyy-MM-dd")}</ses:fechaSalida>
        <ses:persona>
          <ses:nombre>${escapeXml(booking.guest.firstName)}</ses:nombre>
          <ses:apellidos>${escapeXml(booking.guest.lastName)}</ses:apellidos>
          <ses:tipoDocumento>${documentType}</ses:tipoDocumento>
          <ses:numeroDocumento>${escapeXml(booking.guest.documentId)}</ses:numeroDocumento>
          <ses:nacionalidad>${escapeXml(booking.guest.nationality ?? "ESP")}</ses:nacionalidad>
          ${booking.guest.birthDate ? `<ses:fechaNacimiento>${formatDate(booking.guest.birthDate, "yyyy-MM-dd")}</ses:fechaNacimiento>` : ""}
          <ses:telefono>${escapeXml(booking.guest.phone ?? "")}</ses:telefono>
          <ses:email>${escapeXml(booking.guest.email)}</ses:email>
        </ses:persona>
      </ses:parteEntrada>
    </ses:comunicacionRequest>
  </soapenv:Body>
</soapenv:Envelope>`;
}

/**
 * Envía la comunicación de un huésped a SES.HOSPEDAJES. Lo dispara el
 * personal a mano desde el admin (no automático). Best-effort: guarda el
 * resultado en la reserva y nunca lanza fuera de esta función.
 */
export async function submitTravelerReport(bookingId: string): Promise<{ ok: boolean; message: string }> {
  const config = getConfig();
  if (!config) {
    return { ok: false, message: "SES no está configurado (faltan SES_WS_USERNAME/SES_WS_PASSWORD)." };
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { guest: true },
  });

  if (!booking) {
    return { ok: false, message: "Reserva no encontrada." };
  }

  const envelope = buildSoapEnvelope(booking);
  const basicAuth = Buffer.from(`${config.username}:${config.password}`).toString("base64");

  try {
    const res = await fetch(config.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        Authorization: `Basic ${basicAuth}`,
      },
      body: envelope,
    });

    const responseText = await res.text();

    if (!res.ok) {
      await prisma.booking.update({
        where: { id: bookingId },
        data: { sesSubmissionError: `SES ${res.status}: ${responseText.slice(0, 500)}` },
      });
      return { ok: false, message: `SES respondió con error (${res.status}). Revisa el envelope contra el WSDL real.` };
    }

    await prisma.booking.update({
      where: { id: bookingId },
      data: { sesSubmittedAt: new Date(), sesSubmissionError: null },
    });
    return { ok: true, message: "Comunicado a SES.HOSPEDAJES correctamente." };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Error desconocido.";
    await prisma.booking.update({
      where: { id: bookingId },
      data: { sesSubmissionError: msg },
    });
    return { ok: false, message: `No se pudo conectar con SES: ${msg}` };
  }
}
