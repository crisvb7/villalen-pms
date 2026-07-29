// app/admin/calendario/page.tsx
"use client";

import { useEffect, useState } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isToday,
  isWeekend,
  parseISO,
  isBefore,
  startOfDay,
  addMonths,
  subMonths,
} from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Booking {
  id: string;
  checkInDate: string;
  checkOutDate: string;
  status: string;
  guest: { firstName: string; lastName: string };
  room: { name: string };
  roomId: string;
}

interface Room {
  id: string;
  name: string;
  capacity: number;
}

const STATUS_BG: Record<string, string> = {
  PENDING: "bg-amber-100 border-amber-300 text-amber-900",
  CONFIRMED: "bg-emerald-100 border-emerald-300 text-emerald-900",
  CHECKED_IN: "bg-blue-100 border-blue-300 text-blue-900",
  CHECKED_OUT: "bg-stone-100 border-stone-300 text-stone-500",
};

export default function CalendarioPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/bookings").then((r) => r.json()),
      fetch("/api/rooms").then((r) => r.json()),
    ]).then(([bookingsRes, roomsRes]) => {
      setBookings((bookingsRes.data ?? []).filter((b: Booking) => b.status !== "CANCELLED"));
      setRooms(roomsRes.data ?? []);
      setLoading(false);
    });
  }, []);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getBooking = (day: Date, roomId: string) => {
    const d = startOfDay(day);
    return bookings.find((b) => {
      if (b.roomId !== roomId) return false;
      const ci = startOfDay(parseISO(b.checkInDate));
      const co = startOfDay(parseISO(b.checkOutDate));
      return !isBefore(d, ci) && isBefore(d, co);
    });
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl text-stone-800">Calendario</h1>
          <p className="text-sm text-stone-500 mt-1">
            Ocupación por habitación y día
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="btn-ghost"
          >
            ← Anterior
          </button>
          <span className="font-serif text-lg text-stone-700 capitalize min-w-[180px] text-center">
            {format(currentMonth, "MMMM yyyy", { locale: es })}
          </span>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="btn-ghost"
          >
            Siguiente →
          </button>
          <button
            onClick={() => setCurrentMonth(new Date())}
            className="btn-secondary text-xs px-3 py-2"
          >
            Hoy
          </button>
        </div>
      </div>

      {/* Leyenda */}
      <div className="flex gap-4 mb-4 flex-wrap">
        {[
          { label: "Pendiente", color: "bg-amber-100 border-amber-300" },
          { label: "Confirmada", color: "bg-emerald-100 border-emerald-300" },
          { label: "En casa", color: "bg-blue-100 border-blue-300" },
          { label: "Finalizada", color: "bg-stone-100 border-stone-300" },
          { label: "Libre", color: "bg-white border-stone-200" },
        ].map((l) => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded-sm border ${l.color}`} />
            <span className="text-xs text-stone-500">{l.label}</span>
          </div>
        ))}
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-stone-400">Cargando calendario…</div>
        ) : rooms.length === 0 ? (
          <div className="p-12 text-center text-stone-400">No hay habitaciones configuradas.</div>
        ) : (
          <div className="overflow-auto max-h-[75vh]">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  <th className="sticky top-0 left-0 z-20 bg-stone-50 border-b border-r border-stone-100 px-3 py-3 text-left text-xs uppercase tracking-wider text-stone-400 font-medium min-w-[110px]">
                    Fecha
                  </th>
                  {rooms.map((room) => (
                    <th
                      key={room.id}
                      className="sticky top-0 z-10 bg-stone-50 border-b border-stone-100 px-3 py-3 text-center text-xs uppercase tracking-wider text-stone-500 font-medium min-w-[130px]"
                    >
                      {room.name}
                      <span className="block normal-case text-[10px] text-stone-400 font-normal mt-0.5">
                        {room.capacity} pers.
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {days.map((day) => {
                  const today = isToday(day);
                  return (
                    <tr
                      key={day.toISOString()}
                      className={cn(isWeekend(day) && "bg-stone-50/40")}
                    >
                      <td
                        className={cn(
                          "sticky left-0 z-10 border-b border-r border-stone-100 px-3 py-2 bg-white",
                          isWeekend(day) && "bg-stone-50/40",
                          today && "bg-amber-50"
                        )}
                      >
                        <span className={cn("text-sm", today ? "font-semibold text-stone-900" : "text-stone-600")}>
                          {format(day, "EEE d 'de' MMM", { locale: es })}
                        </span>
                      </td>
                      {rooms.map((room) => {
                        const booking = getBooking(day, room.id);
                        return (
                          <td
                            key={room.id}
                            className="border-b border-r border-stone-50 p-1 align-top"
                          >
                            {booking ? (
                              <div
                                className={cn(
                                  "text-xs px-2 py-1.5 border truncate",
                                  STATUS_BG[booking.status] ?? "bg-stone-100 border-stone-300"
                                )}
                                title={`${booking.guest.firstName} ${booking.guest.lastName} — ${format(
                                  parseISO(booking.checkInDate),
                                  "dd/MM"
                                )} → ${format(parseISO(booking.checkOutDate), "dd/MM")}`}
                              >
                                {booking.guest.firstName} {booking.guest.lastName.charAt(0)}.
                              </div>
                            ) : (
                              <div className="text-xs px-2 py-1.5 text-stone-300 text-center">·</div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
