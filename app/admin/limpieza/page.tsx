// app/admin/limpieza/page.tsx
"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface CleaningRoom {
  id: string;
  name: string;
  isClean: boolean;
  capacity: number;
  bookings: Array<{
    checkOutDate: string;
    guest: { firstName: string; lastName: string };
  }>;
}

export default function LimpiezaPage() {
  const [rooms, setRooms] = useState<CleaningRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      const res = await fetch("/api/rooms/cleaning");
      const data = await res.json();
      setRooms(data.data ?? []);
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
    }
  };

  const toggleCleanStatus = async (id: string, current: boolean) => {
    setUpdating(id);
    try {
      await fetch("/api/rooms/cleaning", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isClean: !current }),
      });
      setRooms((prev) =>
        prev.map((r) => (r.id === id ? { ...r, isClean: !current } : r))
      );
      setLastUpdated(new Date());
    } finally {
      setUpdating(null);
    }
  };

  const markAllClean = async () => {
    const dirty = rooms.filter((r) => !r.isClean);
    if (dirty.length === 0) return;
    if (!confirm(`¿Marcar ${dirty.length} habitación(es) como limpias?`)) return;

    for (const room of dirty) {
      await toggleCleanStatus(room.id, false);
    }
  };

  const cleanCount = rooms.filter((r) => r.isClean).length;
  const dirtyCount = rooms.filter((r) => !r.isClean).length;

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="font-serif text-3xl text-stone-800">
            Estado de Limpieza
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            {cleanCount} limpia{cleanCount !== 1 ? "s" : ""} ·{" "}
            <span className={dirtyCount > 0 ? "text-red-600 font-medium" : ""}>
              {dirtyCount} pendiente{dirtyCount !== 1 ? "s" : ""}
            </span>
            {lastUpdated && (
              <span className="ml-3 text-stone-300">
                · actualizado{" "}
                {lastUpdated.toLocaleTimeString("es-ES", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchRooms}
            className="btn-ghost text-sm"
          >
            ↻ Actualizar
          </button>
          {dirtyCount > 0 && (
            <button onClick={markAllClean} className="btn-secondary text-sm">
              ✓ Todo limpio
            </button>
          )}
        </div>
      </div>

      {/* Leyenda */}
      <div className="flex gap-4 mb-6">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-400" />
          <span className="text-xs text-stone-500">Limpia</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <span className="text-xs text-stone-500">Pendiente de limpieza</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-400" />
          <span className="text-xs text-stone-500">Ocupada actualmente</span>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-6 animate-pulse">
              <div className="h-5 bg-stone-200 rounded w-3/4 mb-3" />
              <div className="h-4 bg-stone-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map((room) => {
            const isOccupied = room.bookings.length > 0;
            const isUpdating = updating === room.id;

            return (
              <div
                key={room.id}
                className={cn(
                  "card p-6 transition-all",
                  room.isClean
                    ? "border-emerald-200"
                    : "border-red-200 bg-red-50/30"
                )}
              >
                {/* Status indicator */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "w-3 h-3 rounded-full flex-shrink-0 mt-1",
                        isOccupied
                          ? "bg-blue-400"
                          : room.isClean
                          ? "bg-emerald-400"
                          : "bg-red-400 animate-pulse"
                      )}
                    />
                    <div>
                      <h3 className="font-serif text-lg text-stone-800">
                        {room.name}
                      </h3>
                      <p className="text-xs text-stone-400">
                        Hasta {room.capacity} personas
                      </p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "text-xs font-medium px-2 py-1 border",
                      room.isClean
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-red-50 text-red-700 border-red-200"
                    )}
                  >
                    {room.isClean ? "✓ Limpia" : "⚠ Sucia"}
                  </span>
                </div>

                {/* Ocupación actual */}
                {isOccupied && (
                  <div className="mb-4 bg-blue-50 border border-blue-100 p-3 text-xs">
                    <p className="text-blue-800 font-medium">Ocupada ahora</p>
                    <p className="text-blue-600">
                      {room.bookings[0].guest.firstName}{" "}
                      {room.bookings[0].guest.lastName}
                    </p>
                    <p className="text-blue-500">
                      Salida:{" "}
                      {new Date(
                        room.bookings[0].checkOutDate
                      ).toLocaleDateString("es-ES")}
                    </p>
                  </div>
                )}

                {/* Botón de cambio */}
                <button
                  onClick={() => toggleCleanStatus(room.id, room.isClean)}
                  disabled={isUpdating}
                  className={cn(
                    "w-full py-3 text-sm font-medium border transition-all active:scale-[0.98] disabled:opacity-50",
                    room.isClean
                      ? "bg-white border-stone-200 text-stone-600 hover:bg-red-50 hover:border-red-200 hover:text-red-700"
                      : "bg-emerald-600 border-emerald-700 text-white hover:bg-emerald-700"
                  )}
                >
                  {isUpdating
                    ? "Actualizando…"
                    : room.isClean
                    ? "🧹 Marcar como sucia"
                    : "✓ Marcar como limpia"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {rooms.length === 0 && !loading && (
        <div className="card p-12 text-center">
          <p className="text-stone-400">
            No hay habitaciones configuradas en el sistema.
          </p>
        </div>
      )}
    </div>
  );
}
