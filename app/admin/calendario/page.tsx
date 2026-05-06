// app/admin/calendario/page.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  parseISO,
  isBefore,
  isAfter,
  startOfDay,
  addMonths,
  subMonths,
  getDay,
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
}

const STATUS_BG: Record<string, string> = {
  PENDING: "bg-amber-400",
  CONFIRMED: "bg-emerald-500",
  CANCELLED: "bg-red-300",
  CHECKED_IN: "bg-blue-500",
  CHECKED_OUT: "bg-stone-300",
};

const DAYS_ES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export default function CalendarioPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  useEffect(() => {
    fetch("/api/bookings")
      .then((r) => r.json())
      .then((d) => {
        setBookings(d.data ?? []);
        setLoading(false);
      });
  }, []);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Offset para el primer día (lunes = 0)
  const firstDayOffset = (getDay(monthStart) + 6) % 7;
  const paddingDays = Array(firstDayOffset).fill(null);

  // Reservas que se superponen con un día dado
  const getBookingsForDay = (day: Date) => {
    const d = startOfDay(day);
    return bookings.filter((b) => {
      const ci = startOfDay(parseISO(b.checkInDate));
      const co = startOfDay(parseISO(b.checkOutDate));
      return !isBefore(d, ci) && isBefore(d, co) && b.status !== "CANCELLED";
    });
  };

  const selectedBookings = selectedDay ? getBookingsForDay(selectedDay) : [];

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl text-stone-800">Calendario</h1>
          <p className="text-sm text-stone-500 mt-1">
            Vista mensual de ocupación
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
          { label: "Pendiente", color: "bg-amber-400" },
          { label: "Confirmada", color: "bg-emerald-500" },
          { label: "En casa", color: "bg-blue-500" },
          { label: "Finalizada", color: "bg-stone-300" },
        ].map((l) => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded-sm ${l.color}`} />
            <span className="text-xs text-stone-500">{l.label}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-6">
        {/* Calendario */}
        <div className="flex-1 card overflow-hidden">
          {/* Cabecera días */}
          <div className="grid grid-cols-7 border-b border-stone-100">
            {DAYS_ES.map((d) => (
              <div
                key={d}
                className="py-3 text-center text-xs font-medium uppercase tracking-wider text-stone-400"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Días del mes */}
          {loading ? (
            <div className="p-12 text-center text-stone-400">
              Cargando calendario…
            </div>
          ) : (
            <div className="grid grid-cols-7">
              {/* Padding inicial */}
              {paddingDays.map((_, i) => (
                <div
                  key={`pad-${i}`}
                  className="min-h-[90px] border-b border-r border-stone-50 bg-stone-50/30"
                />
              ))}

              {days.map((day) => {
                const dayBookings = getBookingsForDay(day);
                const isSelected =
                  selectedDay &&
                  format(day, "yyyy-MM-dd") ===
                    format(selectedDay, "yyyy-MM-dd");
                const today = isToday(day);

                return (
                  <div
                    key={day.toISOString()}
                    onClick={() =>
                      setSelectedDay(isSelected ? null : day)
                    }
                    className={cn(
                      "min-h-[90px] border-b border-r border-stone-100 p-2 cursor-pointer transition-colors",
                      isSelected
                        ? "bg-amber-50 border-amber-200"
                        : "hover:bg-stone-50",
                      !isSameMonth(day, currentMonth) && "bg-stone-50/50"
                    )}
                  >
                    <span
                      className={cn(
                        "inline-flex items-center justify-center w-6 h-6 text-xs mb-1 font-medium",
                        today
                          ? "bg-stone-900 text-white rounded-full"
                          : "text-stone-600"
                      )}
                    >
                      {format(day, "d")}
                    </span>

                    {/* Chips de reservas */}
                    <div className="space-y-0.5">
                      {dayBookings.slice(0, 3).map((b) => (
                        <div
                          key={b.id}
                          className={cn(
                            "text-white text-[10px] px-1.5 py-0.5 truncate leading-tight",
                            STATUS_BG[b.status] ?? "bg-stone-400"
                          )}
                          title={`${b.guest.firstName} ${b.guest.lastName} — ${b.room.name}`}
                        >
                          {b.guest.firstName} · {b.room.name.split(" ")[0]}
                        </div>
                      ))}
                      {dayBookings.length > 3 && (
                        <div className="text-[10px] text-stone-400 pl-1">
                          +{dayBookings.length - 3} más
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Panel lateral — día seleccionado */}
        {selectedDay && (
          <div className="w-72 flex-shrink-0 card p-5">
            <div className="mb-4 pb-3 border-b border-stone-100">
              <p className="text-xs uppercase tracking-widest text-stone-400 mb-1">
                Ocupación del día
              </p>
              <h3 className="font-serif text-xl text-stone-800 capitalize">
                {format(selectedDay, "EEEE d 'de' MMMM", { locale: es })}
              </h3>
            </div>

            {selectedBookings.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-3xl mb-2">✓</p>
                <p className="text-sm text-stone-400">
                  Sin ocupación este día
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedBookings.map((b) => (
                  <div
                    key={b.id}
                    className="border border-stone-100 p-3"
                  >
                    <div className="flex items-start justify-between mb-1">
                      <p className="font-medium text-stone-800 text-sm">
                        {b.guest.firstName} {b.guest.lastName}
                      </p>
                      <div
                        className={cn(
                          "w-2 h-2 rounded-full mt-1.5 flex-shrink-0",
                          STATUS_BG[b.status]
                        )}
                      />
                    </div>
                    <p className="text-xs text-stone-500">{b.room.name}</p>
                    <p className="text-xs text-stone-400 mt-1">
                      {format(parseISO(b.checkInDate), "dd/MM")} →{" "}
                      {format(parseISO(b.checkOutDate), "dd/MM")}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setSelectedDay(null)}
              className="btn-ghost w-full mt-4 text-xs"
            >
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
