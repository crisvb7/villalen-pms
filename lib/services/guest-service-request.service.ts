// lib/services/guest-service-request.service.ts
// Peticiones diarias que el huésped marca desde la app: desayuno del día
// siguiente, cena (menú del peregrino) y limpieza de habitación. Una fila
// por combinación reserva+día+tipo — desmarcar reutiliza la misma fila (ver
// @@unique en el schema) en vez de borrarla, para conservar el historial.

import { parseISO, isValid } from "date-fns";
import { prisma } from "@/lib/prisma";
import { GuestServiceType, GuestServiceStatus } from "@prisma/client";
import type { Booking } from "@prisma/client";

// Hora límite (UTC — todo el proyecto fuerza TZ=UTC, ver README) para cada
// tipo de petición, como desplazamiento en días respecto al día del
// servicio. El desayuno del día D se confirma la noche de (D-1) a las
// 22:00; la cena y la limpieza son plazos del propio día D.
export const SERVICE_CUTOFFS: Record<
  GuestServiceType,
  { dayOffset: number; hour: number; label: string }
> = {
  BREAKFAST: {
    dayOffset: -1,
    hour: 22,
    label: "Puedes confirmar hasta las 22:00 del día anterior.",
  },
  DINNER: { dayOffset: 0, hour: 20, label: "Confirma antes de las 20:00." },
  CLEANING: { dayOffset: 0, hour: 11, label: "Puedes pedirla antes de las 11:00." },
};

export function getServiceCutoff(type: GuestServiceType, date: Date): Date {
  const cfg = SERVICE_CUTOFFS[type];
  const cutoff = new Date(date);
  cutoff.setUTCDate(cutoff.getUTCDate() + cfg.dayOffset);
  cutoff.setUTCHours(cfg.hour, 0, 0, 0);
  return cutoff;
}

export function isServiceRequestable(
  type: GuestServiceType,
  date: Date,
  now: Date = new Date()
): boolean {
  return now.getTime() < getServiceCutoff(type, date).getTime();
}

function normalizeDate(input: string | Date): Date {
  const date = typeof input === "string" ? parseISO(input) : new Date(input);
  if (!isValid(date)) throw new Error("Fecha inválida.");
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

// El selector de días de la app solo muestra noches de estancia (de
// check-in a la víspera del check-out), así que las peticiones se limitan
// al mismo rango.
function assertDateWithinStay(
  booking: Pick<Booking, "checkInDate" | "checkOutDate">,
  date: Date
) {
  if (date < booking.checkInDate || date >= booking.checkOutDate) {
    throw new Error("Esa fecha está fuera de tu estancia.");
  }
}

export async function listServiceRequests(bookingId: string) {
  return prisma.guestServiceRequest.findMany({
    where: { bookingId },
    orderBy: [{ date: "asc" }, { type: "asc" }],
  });
}

/**
 * Marca o desmarca una petición diaria. Desmarcar (requested = false) se
 * permite siempre; marcar (requested = true) respeta el plazo horario de
 * SERVICE_CUTOFFS — el servidor es quien manda, no basta con deshabilitar
 * el toggle en la app.
 */
export async function setServiceRequest(
  booking: Pick<Booking, "id" | "checkInDate" | "checkOutDate">,
  type: GuestServiceType,
  dateInput: string | Date,
  requested: boolean
) {
  const date = normalizeDate(dateInput);
  assertDateWithinStay(booking, date);

  if (requested && !isServiceRequestable(type, date)) {
    throw new Error("Ya ha pasado el plazo para pedir este servicio ese día.");
  }

  const status = requested ? GuestServiceStatus.REQUESTED : GuestServiceStatus.CANCELLED;

  return prisma.guestServiceRequest.upsert({
    where: { bookingId_date_type: { bookingId: booking.id, date, type } },
    update: { status },
    create: { bookingId: booking.id, date, type, status },
  });
}
