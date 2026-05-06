// lib/utils.ts
// Funciones de utilidad generales

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  differenceInDays,
  format,
  parseISO,
  isValid,
  isBefore,
} from "date-fns";
import { es } from "date-fns/locale";

// ── Tailwind class merging ────────────────────────────────────────────────
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ── Fechas ────────────────────────────────────────────────────────────────

export function formatDate(
  date: Date | string,
  pattern = "dd/MM/yyyy"
): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  if (!isValid(d)) return "—";
  return format(d, pattern, { locale: es });
}

export function formatDateLong(date: Date | string): string {
  return formatDate(date, "d 'de' MMMM 'de' yyyy");
}

export function getNights(checkIn: Date | string, checkOut: Date | string): number {
  const ci = typeof checkIn === "string" ? parseISO(checkIn) : checkIn;
  const co = typeof checkOut === "string" ? parseISO(checkOut) : checkOut;
  return Math.max(0, differenceInDays(co, ci));
}

export function calculateTotal(
  basePrice: number,
  checkIn: Date | string,
  checkOut: Date | string
): number {
  const nights = getNights(checkIn, checkOut);
  return parseFloat((basePrice * nights).toFixed(2));
}

export function isValidDateRange(checkIn: string, checkOut: string): boolean {
  const ci = parseISO(checkIn);
  const co = parseISO(checkOut);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return (
    isValid(ci) &&
    isValid(co) &&
    !isBefore(ci, today) &&
    isBefore(ci, co)
  );
}

// ── Moneda ────────────────────────────────────────────────────────────────

export function formatCurrency(amount: number | string | undefined): string {
  const num = typeof amount === "string" ? parseFloat(amount) : (amount ?? 0);
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(num);
}

// ── Estado de reserva ─────────────────────────────────────────────────────

export const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmada",
  CANCELLED: "Cancelada",
  CHECKED_IN: "En casa",
  CHECKED_OUT: "Finalizada",
};

export const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800 border-amber-200",
  CONFIRMED: "bg-emerald-100 text-emerald-800 border-emerald-200",
  CANCELLED: "bg-red-100 text-red-800 border-red-200",
  CHECKED_IN: "bg-blue-100 text-blue-800 border-blue-200",
  CHECKED_OUT: "bg-stone-100 text-stone-600 border-stone-200",
};

export const SOURCE_LABELS: Record<string, string> = {
  WEB: "Web Propia",
  BOOKING: "Booking.com",
  AIRBNB: "Airbnb",
  MANUAL: "Manual",
  CHANNEX: "Channel Manager",
  PHONE: "Teléfono",
};

// ── Validaciones ──────────────────────────────────────────────────────────

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidDNI(dni: string): boolean {
  // Valida DNI español (8 números + letra) y también acepta pasaporte/NIE
  return dni.length >= 6 && dni.length <= 20;
}

// ── Tipo de documento ─────────────────────────────────────────────────────

export function detectDocumentType(
  doc: string
): "DNI" | "NIE" | "PASAPORTE" {
  const dniRegex = /^\d{8}[A-Za-z]$/;
  const nieRegex = /^[XYZxyz]\d{7}[A-Za-z]$/;
  if (dniRegex.test(doc)) return "DNI";
  if (nieRegex.test(doc)) return "NIE";
  return "PASAPORTE";
}
