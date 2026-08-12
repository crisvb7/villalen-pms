// lib/date.ts

import { format, isSameDay, parseISO } from "date-fns";
import { es } from "date-fns/locale";

export { isSameDay, parseISO };

export function toISODate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function formatWeekdayShort(date: Date): string {
  return format(date, "EEE", { locale: es }).toUpperCase();
}

export function formatDayNumber(date: Date): string {
  return format(date, "d");
}

export function formatLongDate(isoDate: string): string {
  return format(parseISO(isoDate), "d 'de' MMMM", { locale: es });
}

export function formatShortDate(isoDate: string): string {
  return format(parseISO(isoDate), "d MMM", { locale: es });
}

// Math.round() aquí sería un bug: 90min → round(1.5)=2h + "30min" = "2h30min"
// en vez de "1h30min". Las horas enteras siempre se truncan, el resto son
// los minutos sueltos — nunca se redondean juntos.
export function formatDurationMin(durationMin: number): string {
  const hours = Math.floor(durationMin / 60);
  const minutes = durationMin % 60;
  return minutes ? `${hours}h${minutes}min` : `${hours}h`;
}

// El selector de días de estancia solo muestra noches (de check-in a la
// víspera del check-out) — igual que el rango que valida el backend en
// guest-service-request.service.ts.
//
// OJO: checkInIso/checkOutIso ya son medianoche UTC exacta (así los guarda
// Prisma con @db.Date). Generamos el rango sumando 24h en el propio
// timestamp UTC, SIN pasar por funciones de date-fns que interpretan en
// hora local del dispositivo (startOfDay, addDays, eachDayOfInterval) — con
// eso mezclado, lib/service-cutoffs.ts (que calcula en UTC) desplazaba los
// plazos un día entero en cualquier huso por delante de UTC (España en
// verano, UTC+2). Cada Date de este array representa exactamente el mismo
// día que usa el backend, ni un minuto desplazado.
export function stayNights(checkInIso: string, checkOutIso: string): Date[] {
  const checkIn = parseISO(checkInIso).getTime();
  const checkOut = parseISO(checkOutIso).getTime();
  const oneDayMs = 24 * 60 * 60 * 1000;

  const days: Date[] = [];
  for (let t = checkIn; t < checkOut; t += oneDayMs) {
    days.push(new Date(t));
  }
  if (days.length === 0) days.push(new Date(checkIn));
  return days;
}
