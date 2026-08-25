// app/admin/calendario/page.tsx
"use client";

import { Suspense, useEffect, useState, type DragEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  format,
  startOfWeek,
  eachDayOfInterval,
  isToday,
  isWeekend,
  isSameDay,
  parseISO,
  isBefore,
  startOfDay,
  addDays,
  subDays,
  differenceInDays,
} from "date-fns";
import { es } from "date-fns/locale";
import { cn, ROOM_TYPE_LABELS } from "@/lib/utils";

interface Booking {
  id: string;
  checkInDate: string;
  checkOutDate: string;
  status: string;
  roomType: string;
  guest: { firstName: string; lastName: string };
  room: { name: string };
  roomId: string | null;
}

interface Room {
  id: string;
  name: string;
  capacity: number;
  type: string;
}

interface QuickCreateTarget {
  roomId: string;
  roomName: string;
  date: Date;
}

const STATUS_BG: Record<string, string> = {
  PENDING: "bg-terracotta-100 border-terracotta-300 text-terracotta-900",
  CONFIRMED: "bg-emerald-100 border-emerald-300 text-emerald-900",
  CHECKED_IN: "bg-blue-100 border-blue-300 text-blue-900",
  CHECKED_OUT: "bg-stone-100 border-stone-300 text-stone-500",
};

const EMPTY_FORM = {
  firstName: "",
  lastName: "",
  documentId: "",
  email: "",
  phone: "",
  adults: 1,
  children: 0,
};

const WINDOW_DAYS = 7;
const ROOM_COL_WIDTH = 150;
const DAY_COL_MIN_WIDTH = 110;

function CalendarioPageContent() {
  const [viewStart, setViewStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ type: "error" | "success"; message: string } | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const assignBookingId = searchParams.get("assignBookingId");
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  const assigningBooking = assignBookingId
    ? bookings.find((b) => b.id === assignBookingId) ?? null
    : null;

  const draggingBooking = draggingId
    ? bookings.find((b) => b.id === draggingId) ?? null
    : null;

  const [quickCreate, setQuickCreate] = useState<QuickCreateTarget | null>(null);
  const [checkInInput, setCheckInInput] = useState("");
  const [checkOutInput, setCheckOutInput] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const loadData = () => {
    return Promise.all([
      fetch("/api/bookings").then((r) => r.json()),
      fetch("/api/rooms").then((r) => r.json()),
    ]).then(([bookingsRes, roomsRes]) => {
      setBookings((bookingsRes.data ?? []).filter((b: Booking) => b.status !== "CANCELLED"));
      setRooms(roomsRes.data ?? []);
    });
  };

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (assigningBooking) {
      setViewStart(startOfWeek(parseISO(assigningBooking.checkInDate), { weekStartsOn: 1 }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assigningBooking?.id]);

  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 4000);
    return () => clearTimeout(t);
  }, [banner]);

  const days = eachDayOfInterval({ start: viewStart, end: addDays(viewStart, WINDOW_DAYS - 1) });

  const getBooking = (day: Date, roomId: string) => {
    const d = startOfDay(day);
    return bookings.find((b) => {
      if (b.roomId !== roomId) return false;
      const ci = startOfDay(parseISO(b.checkInDate));
      const co = startOfDay(parseISO(b.checkOutDate));
      return !isBefore(d, ci) && isBefore(d, co);
    });
  };

  const isRoomEligibleForAssignment = (room: Room) => {
    if (!assigningBooking) return false;
    if (room.type !== assigningBooking.roomType) return false;

    const aCheckIn = startOfDay(parseISO(assigningBooking.checkInDate));
    const aCheckOut = startOfDay(parseISO(assigningBooking.checkOutDate));

    const hasConflict = bookings.some((b) => {
      if (b.id === assigningBooking.id) return false;
      if (b.roomId !== room.id) return false;
      if (!["PENDING", "CONFIRMED", "CHECKED_IN"].includes(b.status)) return false;
      const ci = startOfDay(parseISO(b.checkInDate));
      const co = startOfDay(parseISO(b.checkOutDate));
      return aCheckIn < co && aCheckOut > ci;
    });

    return !hasConflict;
  };

  const isAssignableCell = (room: Room, day: Date) => {
    if (!assigningBooking) return false;
    if (!isSameDay(day, parseISO(assigningBooking.checkInDate))) return false;
    return isRoomEligibleForAssignment(room);
  };

  const cancelAssignment = () => {
    setAssignError(null);
    router.replace("/admin/calendario");
  };

  const handleAssignRoom = async (room: Room) => {
    if (!assigningBooking) return;
    setAssigning(true);
    setAssignError(null);
    try {
      const res = await fetch(`/api/bookings/${assigningBooking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: room.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAssignError(data.error ?? "No se pudo asignar la habitación.");
        return;
      }
      setBanner({
        type: "success",
        message: `${room.name} asignada a ${assigningBooking.guest.firstName} ${assigningBooking.guest.lastName}.`,
      });
      router.replace("/admin/calendario");
      await loadData();
    } finally {
      setAssigning(false);
    }
  };

  // ── Alta rápida (clic en celda libre) ────────────────────────────────────

  const openQuickCreate = (room: Room, day: Date) => {
    setQuickCreate({ roomId: room.id, roomName: room.name, date: day });
    setCheckInInput(format(day, "yyyy-MM-dd"));
    setCheckOutInput(format(addDays(day, 1), "yyyy-MM-dd"));
    setForm(EMPTY_FORM);
    setCreateError(null);
  };

  const closeQuickCreate = () => {
    setQuickCreate(null);
    setCreateError(null);
  };

  const submitQuickCreate = async () => {
    if (!quickCreate) return;
    if (!form.firstName.trim() || !form.lastName.trim() || !form.documentId.trim() || !form.email.trim()) {
      setCreateError("Nombre, apellidos, documento y email son obligatorios.");
      return;
    }
    if (checkOutInput <= checkInInput) {
      setCreateError("La fecha de salida debe ser posterior a la de entrada.");
      return;
    }

    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: quickCreate.roomId,
          checkInDate: checkInInput,
          checkOutDate: checkOutInput,
          adults: Number(form.adults) || 1,
          children: Number(form.children) || 0,
          source: "MANUAL",
          guest: {
            firstName: form.firstName.trim(),
            lastName: form.lastName.trim(),
            documentId: form.documentId.trim(),
            email: form.email.trim(),
            phone: form.phone.trim() || undefined,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.error ?? "No se pudo crear la reserva.");
        return;
      }
      closeQuickCreate();
      await loadData();
    } finally {
      setCreating(false);
    }
  };

  // ── Modo edición: arrastrar y soltar ─────────────────────────────────────

  const handleDragOver = (e: DragEvent<HTMLTableCellElement>, room: Room, day: Date) => {
    if (!editMode || !draggingId) return;
    if (draggingBooking && room.type !== draggingBooking.roomType) return; // tipo de habitación distinto: no permitir
    const targetBooking = getBooking(day, room.id);
    if (targetBooking && targetBooking.id !== draggingId) return; // ocupado por otra reserva: no permitir
    e.preventDefault();
  };

  const handleDrop = async (e: DragEvent<HTMLTableCellElement>, room: Room, day: Date) => {
    e.preventDefault();
    if (!editMode || !draggingId) return;

    const booking = bookings.find((b) => b.id === draggingId);
    setDraggingId(null);
    if (!booking) return;

    if (room.type !== booking.roomType) {
      setBanner({ type: "error", message: `${room.name} no es del tipo de habitación reservado (${ROOM_TYPE_LABELS[booking.roomType]}).` });
      return;
    }

    const targetBooking = getBooking(day, room.id);
    if (targetBooking && targetBooking.id !== draggingId) return;

    const nights = differenceInDays(parseISO(booking.checkOutDate), parseISO(booking.checkInDate));
    const newCheckIn = day;
    const newCheckOut = addDays(day, nights);

    if (room.id === booking.roomId && isSameDay(newCheckIn, parseISO(booking.checkInDate))) {
      return; // soltada en el mismo sitio
    }

    const previousBookings = bookings;
    setBookings((bs) =>
      bs.map((b) =>
        b.id === booking.id
          ? {
              ...b,
              roomId: room.id,
              room: { ...b.room, name: room.name },
              checkInDate: newCheckIn.toISOString(),
              checkOutDate: newCheckOut.toISOString(),
            }
          : b
      )
    );

    try {
      const res = await fetch(`/api/bookings/${booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: room.id,
          checkInDate: format(newCheckIn, "yyyy-MM-dd"),
          checkOutDate: format(newCheckOut, "yyyy-MM-dd"),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBookings(previousBookings);
        setBanner({ type: "error", message: data.error ?? "No se pudo mover la reserva." });
        return;
      }
      setBanner({ type: "success", message: `Reserva movida a ${room.name}, ${format(newCheckIn, "d 'de' MMMM", { locale: es })}.` });
      await loadData();
    } catch {
      setBookings(previousBookings);
      setBanner({ type: "error", message: "No se pudo mover la reserva." });
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl text-stone-800">Calendario</h1>
          <p className="text-sm text-stone-500 mt-1">
            {editMode
              ? "Arrastra una reserva a otra fecha u habitación libre para moverla."
              : "Clica en un día libre para crear una reserva, o en una reserva para ver su detalle."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setViewStart(subDays(viewStart, WINDOW_DAYS))}
            className="btn-ghost"
          >
            ← Semana anterior
          </button>
          <span className="font-serif text-lg text-stone-700 capitalize min-w-[220px] text-center">
            {format(days[0], "d MMM", { locale: es })} – {format(days[days.length - 1], "d MMM yyyy", { locale: es })}
          </span>
          <button
            onClick={() => setViewStart(addDays(viewStart, WINDOW_DAYS))}
            className="btn-ghost"
          >
            Semana siguiente →
          </button>
          <button
            onClick={() => setViewStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
            className="btn-secondary text-xs px-3 py-2"
          >
            Hoy
          </button>
          <button
            onClick={() => setEditMode((v) => !v)}
            className={cn(
              "filter-chip",
              editMode
                ? "bg-villalen-600 text-white border-villalen-600"
                : "bg-white text-stone-600 border-stone-200 hover:bg-stone-50"
            )}
          >
            {editMode ? "✓ Terminar edición" : "✏️ Editar"}
          </button>
        </div>
      </div>

      {/* Leyenda */}
      <div className="flex gap-4 mb-4 flex-wrap">
        {[
          { label: "Pendiente", color: "bg-terracotta-100 border-terracotta-300" },
          { label: "Confirmada", color: "bg-emerald-100 border-emerald-300" },
          { label: "En casa", color: "bg-blue-100 border-blue-300" },
          { label: "Finalizada", color: "bg-stone-100 border-stone-300" },
          { label: "Libre", color: "bg-white border-stone-200" },
          { label: "Hoy", color: "bg-violet-600 border-violet-600" },
        ].map((l) => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded-full border ${l.color}`} />
            <span className="text-xs text-stone-500">{l.label}</span>
          </div>
        ))}
      </div>

      {assigningBooking && (
        <div className="mb-4 rounded-xl px-4 py-3 bg-violet-50 border border-violet-200 flex items-center justify-between gap-3">
          <p className="text-sm text-violet-900">
            Asignando habitación (<strong>{ROOM_TYPE_LABELS[assigningBooking.roomType]}</strong>)
            para <strong>{assigningBooking.guest.firstName} {assigningBooking.guest.lastName}</strong> —
            haz clic en una celda libre resaltada en verde.
          </p>
          <button onClick={cancelAssignment} className="btn-ghost text-sm flex-shrink-0" disabled={assigning}>
            Cancelar
          </button>
        </div>
      )}
      {assignError && (
        <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded-xl">
          {assignError}
        </p>
      )}
      {banner && (
        <div
          className={cn(
            "mb-4 rounded-xl px-4 py-2.5 text-sm border",
            banner.type === "error"
              ? "bg-red-50 text-red-700 border-red-200"
              : "bg-emerald-50 text-emerald-700 border-emerald-200"
          )}
        >
          {banner.message}
        </div>
      )}

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-stone-400">Cargando calendario…</div>
        ) : rooms.length === 0 ? (
          <div className="p-12 text-center text-stone-400">No hay habitaciones configuradas.</div>
        ) : (
          <div className="overflow-auto max-h-[75vh]">
            <table
              className="border-collapse table-fixed w-full"
              style={{ minWidth: `${ROOM_COL_WIDTH + WINDOW_DAYS * DAY_COL_MIN_WIDTH}px` }}
            >
              <colgroup>
                <col style={{ width: `${ROOM_COL_WIDTH}px` }} />
                {days.map((day) => (
                  <col
                    key={day.toISOString()}
                    style={{ width: `calc((100% - ${ROOM_COL_WIDTH}px) / ${WINDOW_DAYS})` }}
                  />
                ))}
              </colgroup>
              <thead>
                <tr>
                  <th className="sticky top-0 left-0 z-20 bg-stone-50 border-b border-r border-stone-100 px-3 py-3 text-left text-xs uppercase tracking-wider text-stone-400 font-medium">
                    Habitación
                  </th>
                  {days.map((day) => {
                    const today = isToday(day);
                    return (
                      <th
                        key={day.toISOString()}
                        className={cn(
                          "sticky top-0 z-10 border-b py-2 text-center text-xs font-medium transition-colors",
                          today
                            ? "bg-violet-600 border-violet-600 hover:bg-violet-700"
                            : cn(
                                "border-stone-100",
                                isWeekend(day) ? "bg-stone-100" : "bg-stone-50",
                                "hover:bg-stone-200"
                              )
                        )}
                      >
                        <span className={cn("block text-[9px] uppercase", today ? "text-violet-100" : "text-stone-400")}>
                          {format(day, "EEEE", { locale: es })}
                        </span>
                        <span className={cn("font-semibold", today ? "text-white" : "text-stone-600 font-normal")}>
                          {format(day, "d 'de' MMM", { locale: es })}
                        </span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {rooms.map((room) => (
                  <tr key={room.id}>
                    <td className="sticky left-0 z-10 border-b border-r border-stone-100 px-3 py-2 bg-white">
                      <span className="text-sm text-stone-700">{room.name}</span>
                      <span className="block text-[10px] text-stone-400 mt-0.5">{room.capacity} pers.</span>
                    </td>
                    {days.map((day) => {
                      const booking = getBooking(day, room.id);
                      const today = isToday(day);
                      const isDragTarget =
                        editMode &&
                        draggingId &&
                        (!booking || booking.id === draggingId) &&
                        (!draggingBooking || room.type === draggingBooking.roomType);
                      const isAssignTarget = isAssignableCell(room, day);
                      const isAssignBlocked = Boolean(assigningBooking) && !isAssignTarget;
                      return (
                        <td
                          key={day.toISOString()}
                          onDragOver={(e) => handleDragOver(e, room, day)}
                          onDrop={(e) => handleDrop(e, room, day)}
                          onClick={() => {
                            if (assigningBooking) {
                              if (assigning) return;
                              if (isAssignableCell(room, day)) {
                                handleAssignRoom(room);
                              }
                              return;
                            }
                            if (booking) {
                              if (!editMode) router.push(`/admin/reservas/${booking.id}`);
                              return;
                            }
                            openQuickCreate(room, day);
                          }}
                          className={cn(
                            "border-b border-r p-0.5 text-center transition-colors",
                            today ? "border-l-2 border-r-2 border-l-violet-300 border-r-violet-300 bg-violet-50/50" : "border-stone-50",
                            !booking && !assigningBooking && "cursor-pointer",
                            Boolean(booking) && !editMode && !assigningBooking && "cursor-pointer",
                            !booking && isWeekend(day) && !today && "bg-stone-50/60",
                            today ? "hover:bg-violet-100" : "hover:bg-stone-200/70",
                            isDragTarget && !booking && "bg-emerald-50 outline outline-1 outline-emerald-300",
                            isAssignTarget && "bg-emerald-50 outline outline-1 outline-emerald-400 cursor-pointer",
                            isAssignBlocked && "opacity-40 cursor-not-allowed"
                          )}
                        >
                          {booking ? (
                            <div
                              draggable={editMode}
                              onDragStart={(e) => {
                                e.dataTransfer.setData("text/plain", booking.id);
                                setDraggingId(booking.id);
                              }}
                              onDragEnd={() => setDraggingId(null)}
                              className={cn(
                                "h-8 rounded-md border px-1.5 text-xs leading-8 truncate text-left transition-shadow",
                                STATUS_BG[booking.status] ?? "bg-stone-100 border-stone-300",
                                editMode ? "cursor-grab active:cursor-grabbing" : "hover:ring-2 hover:ring-villalen-400",
                                draggingId === booking.id && "opacity-40"
                              )}
                              title={`${booking.guest.firstName} ${booking.guest.lastName} — ${format(
                                parseISO(booking.checkInDate),
                                "dd/MM"
                              )} - ${format(parseISO(booking.checkOutDate), "dd/MM")}`}
                            >
                              {booking.guest.firstName} {booking.guest.lastName}
                            </div>
                          ) : (
                            <div className="h-8" />
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

      {/* Modal de alta rápida */}
      {quickCreate && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md p-6 shadow-lg">
            <div className="mb-4">
              <p className="text-xs uppercase tracking-widest text-stone-400 mb-1">Nueva reserva</p>
              <h3 className="font-serif text-xl text-stone-800">{quickCreate.roomName}</h3>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="label mb-1">Check-in</label>
                <input
                  type="date"
                  className="input w-full text-sm"
                  value={checkInInput}
                  onChange={(e) => setCheckInInput(e.target.value)}
                />
              </div>
              <div>
                <label className="label mb-1">Check-out</label>
                <input
                  type="date"
                  className="input w-full text-sm"
                  value={checkOutInput}
                  onChange={(e) => setCheckOutInput(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="label mb-1">Nombre *</label>
                <input
                  type="text"
                  className="input w-full text-sm"
                  value={form.firstName}
                  onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                />
              </div>
              <div>
                <label className="label mb-1">Apellidos *</label>
                <input
                  type="text"
                  className="input w-full text-sm"
                  value={form.lastName}
                  onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="label mb-1">Documento *</label>
                <input
                  type="text"
                  className="input w-full text-sm"
                  value={form.documentId}
                  onChange={(e) => setForm((f) => ({ ...f, documentId: e.target.value }))}
                />
              </div>
              <div>
                <label className="label mb-1">Teléfono</label>
                <input
                  type="text"
                  className="input w-full text-sm"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>
            </div>

            <div className="mb-3">
              <label className="label mb-1">Email *</label>
              <input
                type="email"
                className="input w-full text-sm"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="label mb-1">Adultos</label>
                <input
                  type="number"
                  min="1"
                  className="input w-full text-sm"
                  value={form.adults}
                  onChange={(e) => setForm((f) => ({ ...f, adults: Number(e.target.value) }))}
                />
              </div>
              <div>
                <label className="label mb-1">Niños</label>
                <input
                  type="number"
                  min="0"
                  className="input w-full text-sm"
                  value={form.children}
                  onChange={(e) => setForm((f) => ({ ...f, children: Number(e.target.value) }))}
                />
              </div>
            </div>

            {createError && <p className="text-xs text-red-600 mb-3">{createError}</p>}

            <div className="flex justify-end gap-2">
              <button onClick={closeQuickCreate} className="btn-ghost text-sm" disabled={creating}>
                Cancelar
              </button>
              <button onClick={submitQuickCreate} className="btn-primary text-sm" disabled={creating}>
                {creating ? "Creando…" : "Crear reserva"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CalendarioPage() {
  return (
    <Suspense>
      <CalendarioPageContent />
    </Suspense>
  );
}
