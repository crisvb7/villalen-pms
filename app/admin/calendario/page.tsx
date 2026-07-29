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
            <table className="border-collapse">
              <thead>
                <tr>
                  <th className="sticky top-0 left-0 z-20 bg-stone-50 border-b border-r border-stone-100 px-3 py-3 text-left text-xs uppercase tracking-wider text-stone-400 font-medium min-w-[150px] w-[150px]">
                    Habitación
                  </th>
                  {days.map((day) => {
                    const today = isToday(day);
                    return (
                      <th
                        key={day.toISOString()}
                        className={cn(
                          "sticky top-0 z-10 border-b border-stone-100 py-2 text-center text-xs font-medium w-[34px] min-w-[34px]",
                          isWeekend(day) ? "bg-stone-100" : "bg-stone-50",
                          today && "bg-amber-100"
                        )}
                      >
                        <span className={cn("block text-[9px] uppercase text-stone-400")}>
                          {format(day, "EEEEE", { locale: es })}
                        </span>
                        <span className={cn(today ? "font-semibold text-stone-900" : "text-stone-600")}>
                          {format(day, "d")}
                        </span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {rooms.map((room) => (
                  <tr key={room.id}>
                    <td className="sticky left-0 z-10 border-b border-r border-stone-100 px-3 py-2 bg-white min-w-[150px] w-[150px]">
                      <span className="text-sm text-stone-700">{room.name}</span>
                      <span className="block text-[10px] text-stone-400 mt-0.5">{room.capacity} pers.</span>
                    </td>
                    {days.map((day) => {
                      const booking = getBooking(day, room.id);
                      const today = isToday(day);
                      return (
                        <td
                          key={day.toISOString()}
                          className={cn(
                            "border-b border-r border-stone-50 p-0.5 text-center",
                            !booking && isWeekend(day) && "bg-stone-50/60",
                            !booking && today && "bg-amber-50/60"
                          )}
                        >
                          {booking ? (
                            <div
                              className={cn(
                                "h-6 border text-[9px] leading-6 truncate",
                                STATUS_BG[booking.status] ?? "bg-stone-100 border-stone-300"
                              )}
                              title={`${booking.guest.firstName} ${booking.guest.lastName} — ${format(
                                parseISO(booking.checkInDate),
                                "dd/MM"
                              )} - ${format(parseISO(booking.checkOutDate), "dd/MM")}`}
                            >
                              {booking.guest.lastName.charAt(0)}
                            </div>
                          ) : (
                            <div className="h-6" />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
