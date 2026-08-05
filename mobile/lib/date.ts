// lib/date.ts
import {
  addDays,
  differenceInCalendarDays,
  eachDayOfInterval,
  format,
  isSameDay,
  isToday,
  isWeekend,
  parseISO,
  startOfDay,
  startOfWeek,
} from "date-fns";
import { es } from "date-fns/locale";

export {
  addDays,
  differenceInCalendarDays,
  eachDayOfInterval,
  isSameDay,
  isToday,
  isWeekend,
  parseISO,
  startOfDay,
};

export function isSameDayAsToday(isoDate: string): boolean {
  return format(parseISO(isoDate), "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
}

export function formatShortDate(isoDate: string): string {
  return format(parseISO(isoDate), "d MMM", { locale: es });
}

export function formatLongDate(isoDate: string): string {
  return format(parseISO(isoDate), "EEEE d 'de' MMMM", { locale: es });
}

export function formatDayMonth(isoDate: string): string {
  return format(parseISO(isoDate), "d MMMM", { locale: es });
}

export function formatMoney(amount: string | number): string {
  const value = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(value);
}

export function mondayOfWeek(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 1 });
}

export function toISODate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function formatWeekdayShort(date: Date): string {
  return format(date, "EEE", { locale: es }).toUpperCase();
}

export function formatDayNumber(date: Date): string {
  return format(date, "d");
}
