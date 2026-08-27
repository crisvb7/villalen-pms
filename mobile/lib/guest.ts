// lib/guest.ts
// Helpers para los datos de la Ficha Policial (SES.HOSPEDAJES) — reflejan
// lib/utils.ts del backend web (detectDocumentType) para que móvil y web
// clasifiquen el documento exactamente igual.

export type DocumentType = "DNI" | "NIE" | "PASAPORTE";

export function detectDocumentType(doc: string): DocumentType {
  const dniRegex = /^\d{8}[A-Za-z]$/;
  const nieRegex = /^[XYZxyz]\d{7}[A-Za-z]$/;
  if (dniRegex.test(doc)) return "DNI";
  if (nieRegex.test(doc)) return "NIE";
  return "PASAPORTE";
}

export function isMinorDob(dob: string): boolean {
  if (!dob) return false;
  const age = (Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  return age < 18;
}

export const SEX_LABELS: Record<string, string> = { H: "Hombre", M: "Mujer" };
