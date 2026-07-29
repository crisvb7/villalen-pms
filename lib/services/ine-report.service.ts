// lib/services/ine-report.service.ts
// Informe exportable con las magnitudes que pide la Encuesta de Ocupación
// Hotelera (EOH) del INE. NO es un envío automático: el INE selecciona una
// muestra de establecimientos y asigna claves de cuestionario propias, no
// existe una API pública general. Este CSV es para rellenar el cuestionario
// a mano si el establecimiento es seleccionado.

import { prisma } from "@/lib/prisma";
import { BookingStatus } from "@prisma/client";
import { differenceInCalendarDays } from "date-fns";

export interface IneReportData {
  year: number;
  month: number;
  travelersCount: number;
  overnightStays: number;
  averageStay: number;
  occupancyPct: number;
  nationalityBreakdown: { nationality: string; count: number }[];
}

export async function buildIneReport(year: number, month: number): Promise<IneReportData> {
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 1);

  const [bookings, rooms] = await Promise.all([
    prisma.booking.findMany({
      where: {
        status: { not: BookingStatus.CANCELLED },
        checkInDate: { lt: monthEnd },
        checkOutDate: { gt: monthStart },
      },
      include: { guest: true },
    }),
    prisma.room.findMany(),
  ]);

  // Viajeros entrados: huéspedes distintos cuya llegada cae dentro del mes.
  const arrivingGuestIds = new Set<string>();
  const nationalityCounts = new Map<string, number>();
  for (const b of bookings) {
    if (b.checkInDate >= monthStart && b.checkInDate < monthEnd && !arrivingGuestIds.has(b.guestId)) {
      arrivingGuestIds.add(b.guestId);
      const nationality = b.guest.nationality ?? "Sin especificar";
      nationalityCounts.set(nationality, (nationalityCounts.get(nationality) ?? 0) + 1);
    }
  }

  // Pernoctaciones: noches-habitación que solapan el mes.
  let overnightStays = 0;
  for (const b of bookings) {
    const overlapStart = b.checkInDate > monthStart ? b.checkInDate : monthStart;
    const overlapEnd = b.checkOutDate < monthEnd ? b.checkOutDate : monthEnd;
    const nights = differenceInCalendarDays(overlapEnd, overlapStart);
    if (nights > 0) overnightStays += nights;
  }

  const travelersCount = arrivingGuestIds.size;
  const averageStay = travelersCount > 0 ? parseFloat((overnightStays / travelersCount).toFixed(2)) : 0;

  const daysInMonth = differenceInCalendarDays(monthEnd, monthStart);
  const capacity = rooms.length * daysInMonth;
  const occupancyPct = capacity > 0 ? parseFloat(((overnightStays / capacity) * 100).toFixed(1)) : 0;

  const nationalityBreakdown = Array.from(nationalityCounts.entries())
    .map(([nationality, count]) => ({ nationality, count }))
    .sort((a, b) => b.count - a.count);

  return { year, month, travelersCount, overnightStays, averageStay, occupancyPct, nationalityBreakdown };
}

export function ineReportToCsv(report: IneReportData): string {
  const lines: string[] = [];
  lines.push("Informe de ocupación (referencia EOH-INE)");
  lines.push(`Periodo,${report.year}-${String(report.month).padStart(2, "0")}`);
  lines.push("");
  lines.push("Magnitud,Valor");
  lines.push(`Viajeros entrados,${report.travelersCount}`);
  lines.push(`Pernoctaciones,${report.overnightStays}`);
  lines.push(`Estancia media (noches),${report.averageStay}`);
  lines.push(`Grado de ocupacion (%),${report.occupancyPct}`);
  lines.push("");
  lines.push("Nacionalidad,Viajeros");
  for (const n of report.nationalityBreakdown) {
    lines.push(`${n.nationality},${n.count}`);
  }
  return lines.join("\n");
}
