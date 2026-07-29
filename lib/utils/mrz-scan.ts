// lib/utils/mrz-scan.ts
// Lectura de la zona MRZ (Machine Readable Zone) de DNI/NIE/pasaportes,
// 100% en el navegador del huésped: OCR con tesseract.js + parseo/validación
// de checksums con la librería `mrz`. Sin coste por escaneo, sin API externa.
// Solo se usa desde componentes cliente (app/precheckin/[id]/page.tsx).

import Tesseract from "tesseract.js";
import { parse as parseMrz } from "mrz";

export interface ScannedMrzData {
  firstName?: string;
  lastName?: string;
  documentId?: string;
  nationality?: string;
  birthDate?: string; // yyyy-MM-dd
}

function parseMrzBirthDate(yyMMdd: string): string | undefined {
  if (!/^\d{6}$/.test(yyMMdd)) return undefined;
  const yy = parseInt(yyMMdd.slice(0, 2), 10);
  const mm = yyMMdd.slice(2, 4);
  const dd = yyMMdd.slice(4, 6);
  const currentYY = new Date().getFullYear() % 100;
  // Heurística estándar MRZ: si el año de 2 dígitos es mayor que el actual,
  // asumimos siglo XX (fechas de nacimiento nunca son futuras).
  const century = yy > currentYY ? 1900 : 2000;
  return `${century + yy}-${mm}-${dd}`;
}

function normalizeLine(raw: string, targetLen: number): string {
  const cleaned = raw.toUpperCase().replace(/[^A-Z0-9<]/g, "");
  if (cleaned.length === targetLen) return cleaned;
  if (cleaned.length > targetLen) return cleaned.slice(0, targetLen);
  return cleaned.padEnd(targetLen, "<");
}

function mapMrzFields(fields: {
  firstName?: string | null;
  lastName?: string | null;
  documentNumber?: string | null;
  nationality?: string | null;
  birthDate?: string | null;
}): ScannedMrzData {
  return {
    firstName: fields.firstName ?? undefined,
    lastName: fields.lastName ?? undefined,
    documentId: fields.documentNumber ?? undefined,
    nationality: fields.nationality ?? undefined,
    birthDate: fields.birthDate ? parseMrzBirthDate(fields.birthDate) : undefined,
  };
}

/**
 * Intenta leer la MRZ de una foto de documento. Devuelve `null` si no
 * encuentra una MRZ legible — el formulario de precheckin sigue editable a
 * mano en ese caso, esto nunca debe bloquear el flujo.
 */
export async function scanMrzFromImage(file: File): Promise<ScannedMrzData | null> {
  try {
    const { data } = await Tesseract.recognize(file, "eng");
    const rawLines = data.text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    // La MRZ va al pie del documento: nos quedamos con líneas "densas" en
    // caracteres típicos de MRZ (letras/dígitos/relleno '<').
    const candidates = rawLines.filter((l) => l.replace(/\s/g, "").length >= 20);

    // Pasaporte (TD3, 2 líneas de 44) / TD2 (2 líneas de 36)
    for (let i = 0; i < candidates.length - 1; i++) {
      for (const len of [44, 36]) {
        try {
          const l1 = normalizeLine(candidates[i], len);
          const l2 = normalizeLine(candidates[i + 1], len);
          const result = parseMrz([l1, l2]);
          if (result.fields.documentNumber) return mapMrzFields(result.fields);
        } catch {
          // formato/checksum no válido con estas líneas, seguir probando
        }
      }
    }

    // DNI español / TD1 (3 líneas de 30)
    for (let i = 0; i < candidates.length - 2; i++) {
      try {
        const lines = [candidates[i], candidates[i + 1], candidates[i + 2]].map((l) =>
          normalizeLine(l, 30)
        );
        const result = parseMrz(lines);
        if (result.fields.documentNumber) return mapMrzFields(result.fields);
      } catch {
        // seguir probando
      }
    }

    return null;
  } catch (error) {
    console.error("[mrz-scan] Error al leer el documento:", error);
    return null;
  }
}
