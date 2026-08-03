// lib/services/stats.service.ts
// Agregados para el panel de Estadísticas. Todo en memoria (volumen pequeño
// para un solo alojamiento) en vez de SQL agregado.

import { prisma } from "@/lib/prisma";
import { BookingStatus } from "@prisma/client";
import { differenceInCalendarDays } from "date-fns";

interface MonthValue {
  month: number; // 1-12
  value: number;
}

export interface YearStats {
  year: number;
  revenueByMonth: MonthValue[];
  expensesByMonth: MonthValue[];
  occupancyByMonth: MonthValue[];
  bookingsBySource: { source: string; count: number }[];
  roomPerformance: { roomName: string; bookings: number; revenue: number }[];
  totals: {
    revenue: number;
    expenses: number;
    net: number;
    averageOccupancy: number;
  };
}

export async function getYearStats(year: number): Promise<YearStats> {
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year + 1, 0, 1);

  const [bookings, expenses, rooms] = await Promise.all([
    prisma.booking.findMany({
      where: {
        status: { not: BookingStatus.CANCELLED },
        checkInDate: { lt: yearEnd },
        checkOutDate: { gt: yearStart },
      },
      include: { room: true },
    }),
    prisma.expense.findMany({
      where: { date: { gte: yearStart, lt: yearEnd } },
    }),
    prisma.room.findMany(),
  ]);

  const emptyMonths = (): MonthValue[] =>
    Array.from({ length: 12 }, (_, i) => ({ month: i + 1, value: 0 }));

  // ── Ingresos por mes (según checkInDate) ──────────────────────────────
  const revenueByMonth = emptyMonths();
  for (const b of bookings) {
    if (b.checkInDate.getFullYear() === year) {
      revenueByMonth[b.checkInDate.getMonth()].value += parseFloat(b.totalAmount.toString());
    }
  }

  // ── Gastos por mes ─────────────────────────────────────────────────────
  const expensesByMonth = emptyMonths();
  for (const e of expenses) {
    expensesByMonth[e.date.getMonth()].value += parseFloat(e.amount.toString());
  }

  // ── Ocupación por mes ──────────────────────────────────────────────────
  const totalRooms = rooms.length;
  const occupancyByMonth = emptyMonths().map(({ month }) => {
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 1);
    const daysInMonth = differenceInCalendarDays(monthEnd, monthStart);

    let bookedNights = 0;
    for (const b of bookings) {
      const overlapStart = b.checkInDate > monthStart ? b.checkInDate : monthStart;
      const overlapEnd = b.checkOutDate < monthEnd ? b.checkOutDate : monthEnd;
      const nights = differenceInCalendarDays(overlapEnd, overlapStart);
      if (nights > 0) bookedNights += nights;
    }

    const capacity = totalRooms * daysInMonth;
    const value = capacity > 0 ? parseFloat(((bookedNights / capacity) * 100).toFixed(1)) : 0;
    return { month, value };
  });

  // ── Reservas por canal ─────────────────────────────────────────────────
  const sourceCounts = new Map<string, number>();
  for (const b of bookings) {
    sourceCounts.set(b.source, (sourceCounts.get(b.source) ?? 0) + 1);
  }
  const bookingsBySource = Array.from(sourceCounts.entries()).map(([source, count]) => ({
    source,
    count,
  }));

  // ── Rendimiento por habitación ─────────────────────────────────────────
  const roomMap = new Map<string, { roomName: string; bookings: number; revenue: number }>();
  for (const b of bookings) {
    if (!b.roomId || !b.room) continue;
    const entry = roomMap.get(b.roomId) ?? { roomName: b.room.name, bookings: 0, revenue: 0 };
    entry.bookings += 1;
    entry.revenue += parseFloat(b.totalAmount.toString());
    roomMap.set(b.roomId, entry);
  }
  const roomPerformance = Array.from(roomMap.values())
    .map((r) => ({ ...r, revenue: parseFloat(r.revenue.toFixed(2)) }))
    .sort((a, b) => b.revenue - a.revenue);

  const round = (n: number) => parseFloat(n.toFixed(2));
  const totalRevenue = round(revenueByMonth.reduce((s, m) => s + m.value, 0));
  const totalExpenses = round(expensesByMonth.reduce((s, m) => s + m.value, 0));
  const monthsWithData = occupancyByMonth.filter((m) => m.value > 0);
  const averageOccupancy =
    monthsWithData.length > 0
      ? round(monthsWithData.reduce((s, m) => s + m.value, 0) / monthsWithData.length)
      : 0;

  return {
    year,
    revenueByMonth: revenueByMonth.map((m) => ({ ...m, value: round(m.value) })),
    expensesByMonth: expensesByMonth.map((m) => ({ ...m, value: round(m.value) })),
    occupancyByMonth,
    bookingsBySource,
    roomPerformance,
    totals: {
      revenue: totalRevenue,
      expenses: totalExpenses,
      net: round(totalRevenue - totalExpenses),
      averageOccupancy,
    },
  };
}

export async function getAvailableYears(): Promise<number[]> {
  const [earliest, latest] = await Promise.all([
    prisma.booking.findFirst({ orderBy: { checkInDate: "asc" }, select: { checkInDate: true } }),
    prisma.booking.findFirst({ orderBy: { checkInDate: "desc" }, select: { checkInDate: true } }),
  ]);

  const currentYear = new Date().getFullYear();
  const minYear = earliest ? earliest.checkInDate.getFullYear() : currentYear;
  const maxYear = latest ? Math.max(latest.checkInDate.getFullYear(), currentYear) : currentYear;

  const years: number[] = [];
  for (let y = maxYear; y >= minYear; y--) years.push(y);
  return years;
}
