// lib/services/guest-service-request.service.ts
// Peticiones diarias que el huésped marca desde la app: desayuno del día
// siguiente, cena (menú del peregrino) y limpieza de habitación. Una fila
// por combinación reserva+día+tipo — desmarcar reutiliza la misma fila (ver
// @@unique en el schema) en vez de borrarla, para conservar el historial.

import { parseISO, isValid } from "date-fns";
import { prisma } from "@/lib/prisma";
import { GuestServiceType, GuestServiceStatus, BookingStatus } from "@prisma/client";
import type { Booking } from "@prisma/client";
import { getHotelSettings } from "@/lib/services/hotel-setting.service";

export const SERVICE_TYPES: GuestServiceType[] = [
  GuestServiceType.BREAKFAST,
  GuestServiceType.DINNER,
  GuestServiceType.CLEANING,
];

// Hora límite (UTC — todo el proyecto fuerza TZ=UTC, ver README) para cada
// tipo de petición, como desplazamiento en días respecto al día del
// servicio. El desayuno del día D se confirma la noche de (D-1) a las
// 23:00; la cena y la limpieza son plazos del propio día D.
export const SERVICE_CUTOFFS: Record<
  GuestServiceType,
  { dayOffset: number; hour: number; label: string }
> = {
  BREAKFAST: {
    dayOffset: -1,
    hour: 23,
    label: "Puedes confirmar hasta las 23:00 del día anterior.",
  },
  DINNER: {
    dayOffset: 0,
    hour: 17,
    label: "Solo peregrinos. Confirma antes de las 17:00.",
  },
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
 *
 * `bypassCutoff`: para cuando lo marca el personal (web/app de gestión) en
 * vez del huésped — p. ej. un huésped llama a recepción después del plazo
 * pidiendo desayuno igualmente. El huésped nunca puede saltarse el plazo
 * por su cuenta; el personal sí.
 *
 * `bypassDinnerAvailability`: la cena es solo temporada de peregrinos
 * (ver lib/services/hotel-setting.service.ts). El huésped no puede pedirla
 * si está apagada; el personal sí, por si hay un acuerdo puntual.
 */
export async function setServiceRequest(
  booking: Pick<Booking, "id" | "checkInDate" | "checkOutDate">,
  type: GuestServiceType,
  dateInput: string | Date,
  requested: boolean,
  options?: { bypassCutoff?: boolean; bypassDinnerAvailability?: boolean }
) {
  const date = normalizeDate(dateInput);
  assertDateWithinStay(booking, date);

  if (requested && !options?.bypassCutoff && !isServiceRequestable(type, date)) {
    throw new Error("Ya ha pasado el plazo para pedir este servicio ese día.");
  }

  if (requested && type === GuestServiceType.DINNER && !options?.bypassDinnerAvailability) {
    const settings = await getHotelSettings();
    if (!settings.dinnerServiceEnabled) {
      throw new Error("El servicio de cena no está disponible en estas fechas.");
    }
  }

  const status = requested ? GuestServiceStatus.REQUESTED : GuestServiceStatus.CANCELLED;

  return prisma.guestServiceRequest.upsert({
    where: { bookingId_date_type: { bookingId: booking.id, date, type } },
    update: { status },
    create: { bookingId: booking.id, date, type, status },
  });
}

// ── Panel operativo "Hoy" (personal) ────────────────────────────────────

export interface TodayBoardRow {
  bookingId: string;
  roomName: string;
  guestName: string;
  requests: Record<GuestServiceType, boolean>;
}

/**
 * Todas las reservas activas que ocupan una habitación en `date` (misma
 * regla que getCurrentOccupancy en booking.service.ts), con el estado de
 * sus 3 peticiones diarias para ese día — para el tablón de "hoy" del
 * personal (desayunos/cenas/limpiezas), no solo las reservas que ya pidieron
 * algo, así se puede marcar manualmente cualquiera de las 3.
 */
export async function listTodayBoard(dateInput: string | Date): Promise<TodayBoardRow[]> {
  const date = normalizeDate(dateInput);

  const bookings = await prisma.booking.findMany({
    where: {
      checkInDate: { lte: date },
      checkOutDate: { gt: date },
      status: { in: [BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN] },
    },
    include: { guest: true, room: true },
    orderBy: [{ room: { name: "asc" } }],
  });

  const requests = await prisma.guestServiceRequest.findMany({
    where: { date, bookingId: { in: bookings.map((b) => b.id) }, status: GuestServiceStatus.REQUESTED },
  });

  const requestedByBooking = new Map<string, Set<GuestServiceType>>();
  for (const req of requests) {
    if (!requestedByBooking.has(req.bookingId)) requestedByBooking.set(req.bookingId, new Set());
    requestedByBooking.get(req.bookingId)!.add(req.type);
  }

  return bookings.map((booking) => {
    const requested = requestedByBooking.get(booking.id) ?? new Set<GuestServiceType>();
    return {
      bookingId: booking.id,
      roomName: booking.room?.name ?? "Sin asignar",
      guestName: `${booking.guest.firstName} ${booking.guest.lastName}`,
      requests: {
        BREAKFAST: requested.has(GuestServiceType.BREAKFAST),
        DINNER: requested.has(GuestServiceType.DINNER),
        CLEANING: requested.has(GuestServiceType.CLEANING),
      },
    };
  });
}
