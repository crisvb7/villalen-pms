// lib/services/ses.service.ts
// Ficha Policial — comunicación real a SES.HOSPEDAJES (Ministerio del Interior),
// obligatoria por el RD 933/2021.
//
// Estructura verificada contra el manual técnico oficial "Interfaz servicios
// externos - Servicio de Comunicación Hospedajes v3.1.2" (Secretaría de
// Estado de Seguridad, Subdirección General de Sistemas de Información y
// Comunicaciones para la Seguridad), incluido su ejemplo de petición real
// (Anexo I). Puntos clave confirmados ahí:
//   - Endpoints: test https://hospedajes.pre-ses.mir.es/hospedajes-web/ws/v1/comunicacion
//                prod https://hospedajes.ses.mir.es/hospedajes-web/ws/v1/comunicacion
//   - Auth: HTTP Basic (usuario/contraseña del "Servicio Web") sobre TLS —
//     NO es un UsernameToken de WS-Security, el <soapenv:Header/> va vacío.
//   - El SOAP Body solo lleva codigoArrendador/aplicacion/tipoOperacion/
//     tipoComunicacion; los datos reales del parte (contrato + personas) van
//     en un FICHERO XML APARTE que hay que comprimir en ZIP y codificar en
//     Base64 antes de meterlo en la etiqueta <solicitud>.
//   - Todas las personas de un parte de viajeros (titular incluido) llevan
//     rol "VI" (viajero) — a diferencia de otras comunicaciones (reservas)
//     donde el titular lleva "TI".
//
// ⚠️ Sin verificar todavía (no aparecen en el manual — se obtienen en tiempo
// de ejecución con la operación `catalogo`, ver `queryCatalog` más abajo):
//   - Código de tipoDocumento para pasaporte (usamos "PAS" a falta de
//     confirmación; NIF y NIE sí están confirmados literalmente en el manual).
//   - Códigos de tipoPago distintos de "EFECT" (el único que aparece en el
//     ejemplo oficial); TARJ/TRANS/OTRO son mejor esfuerzo.
// Antes de ir a producción: llamar a `queryCatalog("TIPO_DOCUMENTO")` y
// `queryCatalog("TIPO_PAGO")` contra el entorno de test con credenciales
// reales y ajustar `DOCUMENT_TYPE_CODES`/`mapPaymentMethod` si difieren.

import JSZip from "jszip";
import { prisma } from "@/lib/prisma";
import { ESTABLISHMENT } from "@/lib/establishment";
import { detectDocumentType, formatDate } from "@/lib/utils";
import type { GuestSex, PaymentMethod } from "@prisma/client";

const ENDPOINTS = {
  test: "https://hospedajes.pre-ses.mir.es/hospedajes-web/ws/v1/comunicacion",
  production: "https://hospedajes.ses.mir.es/hospedajes-web/ws/v1/comunicacion",
};

const SOAP_NAMESPACE = "http://www.soap.servicios.hospedajes.mir.es/comunicacion";
// Namespace del fichero XML interno (la "solicitud"), tal cual aparece en el
// ejemplo oficial del manual — específico de la operación de alta de partes.
const PETICION_NAMESPACE = "http://www.neg.hospedajes.mir.es/altaParteHospedaje";

function getConfig() {
  const username = process.env.SES_WS_USERNAME;
  const password = process.env.SES_WS_PASSWORD;
  const landlordCode = process.env.SES_LANDLORD_CODE;
  const establishmentCode = process.env.SES_ESTABLISHMENT_CODE;
  if (!username || !password || !landlordCode || !establishmentCode) return null;

  const env = process.env.SES_ENVIRONMENT === "production" ? "production" : "test";
  return { username, password, landlordCode, establishmentCode, endpoint: ENDPOINTS[env] };
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

// ── Catálogos de códigos ─────────────────────────────────────────────────

// NIF y NIE confirmados literalmente en el manual (campos condicionados a
// "Obligatorio si el tipo de documento es NIF" / "...NIF, NIE"). PAS es
// mejor esfuerzo — confirmar con `queryCatalog("TIPO_DOCUMENTO")`.
const DOCUMENT_TYPE_CODES: Record<"DNI" | "NIE" | "PASAPORTE", string> = {
  DNI: "NIF",
  NIE: "NIE",
  PASAPORTE: "PAS",
};

function sesDocumentType(documentId: string): string {
  return DOCUMENT_TYPE_CODES[detectDocumentType(documentId)];
}

// Solo "EFECT" (efectivo) está confirmado en el manual (ejemplo oficial).
// El resto son mejor esfuerzo — confirmar con `queryCatalog("TIPO_PAGO")`.
function mapPaymentMethod(paymentMethod: PaymentMethod | null | undefined): string {
  switch (paymentMethod) {
    case "CASH":
      return "EFECT";
    case "CARD":
      return "TARJ";
    case "TRANSFER":
      return "TRANS";
    case "OTHER":
      return "OTRO";
    default:
      return "EFECT";
  }
}

interface PersonInput {
  firstName: string;
  lastName: string;
  secondLastName: string | null;
  documentId: string | null;
  documentSupportNumber: string | null;
  nationality: string | null;
  birthDate: Date | null;
  sex: GuestSex | null;
  addressStreet: string | null;
  addressCity: string | null;
  addressMunicipalityCode: string | null;
  addressPostalCode: string | null;
  addressProvince: string | null;
  addressCountry: string | null;
  phone: string | null;
  email: string | null;
  relationshipToLead?: string | null;
}

function isMinor(birthDate: Date | null): boolean {
  if (!birthDate) return false;
  const age = (Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  return age < 18;
}

function buildPersonaXml(person: PersonInput): string {
  const country = person.addressCountry ?? "ESP";
  const isSpain = country.toUpperCase() === "ES" || country.toUpperCase() === "ESP";
  const adult = !isMinor(person.birthDate);

  const documentFields =
    adult && person.documentId
      ? `<tipoDocumento>${sesDocumentType(person.documentId)}</tipoDocumento>
          <numeroDocumento>${escapeXml(person.documentId)}</numeroDocumento>
          ${person.documentSupportNumber ? `<soporteDocumento>${escapeXml(person.documentSupportNumber)}</soporteDocumento>` : ""}`
      : "";

  const contactFields = [
    person.phone ? `<telefono>${escapeXml(person.phone)}</telefono>` : "",
    person.email ? `<correo>${escapeXml(person.email)}</correo>` : "",
  ].join("\n          ");

  return `<persona>
          <rol>VI</rol>
          <nombre>${escapeXml(person.firstName)}</nombre>
          <apellido1>${escapeXml(person.lastName)}</apellido1>
          ${person.secondLastName ? `<apellido2>${escapeXml(person.secondLastName)}</apellido2>` : ""}
          ${documentFields}
          ${person.birthDate ? `<fechaNacimiento>${formatDate(person.birthDate, "yyyy-MM-dd")}</fechaNacimiento>` : ""}
          <nacionalidad>${escapeXml(person.nationality ?? "ESP")}</nacionalidad>
          ${person.sex ? `<sexo>${person.sex}</sexo>` : ""}
          <direccion>
            <direccion>${escapeXml(person.addressStreet ?? "")}</direccion>
            ${isSpain
              ? `<codigoMunicipio>${escapeXml(person.addressMunicipalityCode ?? "")}</codigoMunicipio>`
              : `<nombreMunicipio>${escapeXml(person.addressCity ?? "")}</nombreMunicipio>`}
            <codigoPostal>${escapeXml(person.addressPostalCode ?? "")}</codigoPostal>
            <pais>${escapeXml(country)}</pais>
          </direccion>
          ${contactFields}
          ${!adult && person.relationshipToLead ? `<parentesco>${escapeXml(person.relationshipToLead)}</parentesco>` : ""}
        </persona>`;
}

interface BookingForSes {
  id: string;
  createdAt: Date;
  checkInDate: Date;
  checkOutDate: Date;
  adults: number;
  children: number;
  guest: PersonInput;
  travelers: PersonInput[];
  invoices: { paymentMethod: PaymentMethod | null }[];
}

// Fichero XML "solicitud" — se comprime en ZIP y se codifica en Base64 antes
// de mandarlo (así lo exige el servicio; ver <solicitud> más abajo).
function buildPartesViajerosXml(booking: BookingForSes, establishmentCode: string): string {
  const checkInDateTime = `${formatDate(booking.checkInDate, "yyyy-MM-dd")}T${ESTABLISHMENT.checkInTime}:00`;
  const checkOutDateTime = `${formatDate(booking.checkOutDate, "yyyy-MM-dd")}T${ESTABLISHMENT.checkOutTime}:00`;
  const paymentMethod = booking.invoices[0]?.paymentMethod ?? null;

  // Los acompañantes heredan dirección/contacto del titular si no aportaron
  // los suyos propios (habitual: familia viajando junta) — el bloque
  // <direccion> es obligatorio para cada persona, y hace falta teléfono o
  // correo, así que no pueden ir vacíos.
  const travelersWithFallback = booking.travelers.map((t) => ({
    ...t,
    addressStreet: t.addressStreet ?? booking.guest.addressStreet,
    addressCity: t.addressCity ?? booking.guest.addressCity,
    addressMunicipalityCode: t.addressMunicipalityCode ?? booking.guest.addressMunicipalityCode,
    addressPostalCode: t.addressPostalCode ?? booking.guest.addressPostalCode,
    addressProvince: t.addressProvince ?? booking.guest.addressProvince,
    addressCountry: t.addressCountry ?? booking.guest.addressCountry,
    phone: t.phone ?? booking.guest.phone,
    email: t.email ?? booking.guest.email,
  }));

  const personas = [booking.guest, ...travelersWithFallback].map(buildPersonaXml).join("\n        ");

  return `<?xml version="1.0" encoding="UTF-8"?>
<alt:peticion xmlns:alt="${PETICION_NAMESPACE}">
  <solicitud>
    <codigoEstablecimiento>${escapeXml(establishmentCode)}</codigoEstablecimiento>
    <comunicacion>
      <contrato>
        <referencia>${escapeXml(booking.id)}</referencia>
        <fechaContrato>${formatDate(booking.createdAt, "yyyy-MM-dd")}</fechaContrato>
        <fechaEntrada>${checkInDateTime}</fechaEntrada>
        <fechaSalida>${checkOutDateTime}</fechaSalida>
        <numPersonas>${booking.adults + booking.children}</numPersonas>
        <numHabitaciones>1</numHabitaciones>
        <pago>
          <tipoPago>${mapPaymentMethod(paymentMethod)}</tipoPago>
        </pago>
      </contrato>
        ${personas}
    </comunicacion>
  </solicitud>
</alt:peticion>`;
}

async function zipAndEncode(xml: string): Promise<string> {
  const zip = new JSZip();
  zip.file("solicitud.xml", xml);
  const buffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  return buffer.toString("base64");
}

function buildSoapEnvelope(
  cabecera: { landlordCode: string; tipoOperacion: "A" | "C" | "B"; tipoComunicacion?: "PV" },
  solicitudBase64: string
): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                   xmlns:com="${SOAP_NAMESPACE}">
  <soapenv:Header/>
  <soapenv:Body>
    <com:comunicacionRequest>
      <peticion>
        <cabecera>
          <codigoArrendador>${escapeXml(cabecera.landlordCode)}</codigoArrendador>
          <aplicacion>Villalen PMS</aplicacion>
          <tipoOperacion>${cabecera.tipoOperacion}</tipoOperacion>
          ${cabecera.tipoComunicacion ? `<tipoComunicacion>${cabecera.tipoComunicacion}</tipoComunicacion>` : ""}
        </cabecera>
        <solicitud>${solicitudBase64}</solicitud>
      </peticion>
    </com:comunicacionRequest>
  </soapenv:Body>
</soapenv:Envelope>`;
}

// El servicio devuelve HTTP 200 incluso cuando la comunicación en sí falló
// (p.ej. datos inválidos) — el resultado real va en <respuesta><codigo> del
// cuerpo SOAP, no en el status HTTP. "0" es éxito.
function parseSesResponse(xml: string): { codigo: string | null; descripcion: string | null; lote: string | null } {
  const codigo = xml.match(/<(?:\w+:)?codigo>([^<]*)<\/(?:\w+:)?codigo>/)?.[1] ?? null;
  const descripcion = xml.match(/<(?:\w+:)?descripcion>([^<]*)<\/(?:\w+:)?descripcion>/)?.[1] ?? null;
  const lote = xml.match(/<(?:\w+:)?lote>([^<]*)<\/(?:\w+:)?lote>/)?.[1] ?? null;
  return { codigo, descripcion, lote };
}

/**
 * Envía la comunicación de un huésped a SES.HOSPEDAJES. Lo dispara el
 * personal a mano desde el admin (no automático). Best-effort: guarda el
 * resultado en la reserva y nunca lanza fuera de esta función.
 */
export async function submitTravelerReport(bookingId: string): Promise<{ ok: boolean; message: string }> {
  const config = getConfig();
  if (!config) {
    return {
      ok: false,
      message:
        "SES no está configurado (faltan SES_WS_USERNAME/SES_WS_PASSWORD/SES_LANDLORD_CODE/SES_ESTABLISHMENT_CODE).",
    };
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      guest: true,
      travelers: true,
      invoices: { select: { paymentMethod: true }, orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  if (!booking) {
    return { ok: false, message: "Reserva no encontrada." };
  }

  try {
    const innerXml = buildPartesViajerosXml(booking, config.establishmentCode);
    const solicitudBase64 = await zipAndEncode(innerXml);
    const envelope = buildSoapEnvelope(
      { landlordCode: config.landlordCode, tipoOperacion: "A", tipoComunicacion: "PV" },
      solicitudBase64
    );
    const basicAuth = Buffer.from(`${config.username}:${config.password}`).toString("base64");

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
        data: { sesSubmissionError: `SES HTTP ${res.status}: ${responseText.slice(0, 500)}` },
      });
      return { ok: false, message: `SES respondió con error HTTP (${res.status}).` };
    }

    const { codigo, descripcion, lote } = parseSesResponse(responseText);

    if (codigo !== "0") {
      const errMsg = `SES ${codigo ?? "?"}: ${descripcion ?? responseText.slice(0, 300)}`;
      await prisma.booking.update({
        where: { id: bookingId },
        data: { sesSubmissionError: errMsg },
      });
      return { ok: false, message: errMsg };
    }

    await prisma.booking.update({
      where: { id: bookingId },
      data: { sesSubmittedAt: new Date(), sesSubmissionError: null },
    });
    return {
      ok: true,
      message: `Comunicado a SES.HOSPEDAJES correctamente${lote ? ` (lote ${lote})` : ""}.`,
    };
  } catch (error) {
    const msg = describeNetworkError(error);
    console.error("[submitTravelerReport] Error de red al llamar a SES:", error);
    await prisma.booking.update({
      where: { id: bookingId },
      data: { sesSubmissionError: msg },
    });
    return { ok: false, message: `No se pudo conectar con SES: ${msg}` };
  }
}

// fetch() envuelve cualquier fallo de red (DNS, TLS, timeout, conexión
// rechazada...) en un TypeError genérico "fetch failed" — el motivo real
// vive en `error.cause`, que si no se muestra deja el mensaje inservible
// para diagnosticar (típicamente solo visible en los logs de Vercel, no en
// la respuesta que ve el personal).
function describeNetworkError(error: unknown): string {
  if (!(error instanceof Error)) return "Error desconocido.";
  const cause = (error as Error & { cause?: unknown }).cause;
  if (cause instanceof Error) {
    const code = (cause as NodeJS.ErrnoException).code;
    return `${error.message} — ${cause.message}${code ? ` (${code})` : ""}`;
  }
  if (cause) return `${error.message} — ${String(cause)}`;
  return error.message;
}

/**
 * Consulta un catálogo de códigos oficiales (p.ej. TIPO_DOCUMENTO, SEXO,
 * TIPO_PAGO, TIPO_PARENTESCO) contra SES.HOSPEDAJES. Útil para confirmar en
 * el entorno de test los códigos que este servicio todavía no tiene
 * verificados (ver cabecera del fichero). No se llama desde ningún flujo
 * automático — pensada para ejecutarse a mano una vez haya credenciales
 * reales, p. ej. desde una ruta/script puntual de comprobación.
 */
export async function queryCatalog(
  tabla?: "SEXO" | "TIPO_DOCUMENTO" | "TIPO_PAGO" | "TIPO_PARENTESCO" | "TIPO_ESTABLECIMIENTO"
): Promise<{ ok: boolean; message: string; entries?: { codigo: string; descripcion: string }[] }> {
  const config = getConfig();
  if (!config) {
    return { ok: false, message: "SES no está configurado." };
  }

  const envelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                   xmlns:com="${SOAP_NAMESPACE}">
  <soapenv:Header/>
  <soapenv:Body>
    <com:catalogoRequest>
      <peticion>
        ${tabla ? `<catalogo>${tabla}</catalogo>` : ""}
      </peticion>
    </com:catalogoRequest>
  </soapenv:Body>
</soapenv:Envelope>`;

  const basicAuth = Buffer.from(`${config.username}:${config.password}`).toString("base64");

  try {
    const res = await fetch(config.endpoint, {
      method: "POST",
      headers: { "Content-Type": "text/xml; charset=utf-8", Authorization: `Basic ${basicAuth}` },
      body: envelope,
    });
    const responseText = await res.text();
    if (!res.ok) {
      return { ok: false, message: `SES respondió con error HTTP (${res.status}): ${responseText.slice(0, 300)}` };
    }

    const tuplaRegex = /<tupla>\s*<codigo>([^<]*)<\/codigo>\s*<descripcion>([^<]*)<\/descripcion>\s*<\/tupla>/g;
    const entries: { codigo: string; descripcion: string }[] = [];
    let match: RegExpExecArray | null;
    while ((match = tuplaRegex.exec(responseText)) !== null) {
      entries.push({ codigo: match[1], descripcion: match[2] });
    }
    return { ok: true, message: "ok", entries };
  } catch (error) {
    console.error("[queryCatalog] Error de red al llamar a SES:", error);
    return { ok: false, message: `No se pudo conectar con SES: ${describeNetworkError(error)}` };
  }
}
