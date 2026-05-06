// app/admin/reservas/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  formatDate,
  formatCurrency,
  STATUS_LABELS,
  STATUS_COLORS,
  SOURCE_LABELS,
  getNights,
} from "@/lib/utils";

interface Booking {
  id: string;
  checkInDate: string;
  checkOutDate: string;
  status: string;
  source: string;
  totalAmount: string;
  depositPaid: boolean;
  adults: number;
  children: number;
  guest: {
    firstName: string;
    lastName: string;
    email: string;
    documentId: string;
  };
  room: {
    name: string;
    basePrice: string;
  };
}

export default function AdminReservasPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/bookings");
      const data = await res.json();
      setBookings(data.data ?? []);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: string, status: string, depositPaid?: boolean) => {
    setUpdating(id);
    try {
      await fetch(`/api/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, ...(depositPaid !== undefined ? { depositPaid } : {}) }),
      });
      await fetchBookings();
    } finally {
      setUpdating(null);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm("¿Cancelar esta reserva? Esta acción no se puede deshacer."))
      return;
    await handleStatusChange(id, "CANCELLED");
  };

  const filtered =
    filter === "ALL"
      ? bookings
      : bookings.filter((b) => b.status === filter);

  const statuses = [
    { value: "ALL", label: "Todas" },
    { value: "PENDING", label: "Pendientes" },
    { value: "CONFIRMED", label: "Confirmadas" },
    { value: "CHECKED_IN", label: "En casa" },
    { value: "CHECKED_OUT", label: "Finalizadas" },
    { value: "CANCELLED", label: "Canceladas" },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="font-serif text-3xl text-stone-800">Reservas</h1>
          <p className="text-sm text-stone-500 mt-1">
            {filtered.length} reserva(s) · ordenadas por próximo check-in
          </p>
        </div>
        <Link href="/reserva" className="btn-primary text-sm">
          + Nueva reserva
        </Link>
      </div>

      {/* Filtros por estado */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {statuses.map((s) => (
          <button
            key={s.value}
            onClick={() => setFilter(s.value)}
            className={`px-4 py-2 text-xs font-medium border transition-colors ${
              filter === s.value
                ? "bg-stone-900 text-white border-stone-900"
                : "bg-white text-stone-600 border-stone-200 hover:bg-stone-50"
            }`}
          >
            {s.label}
            <span className="ml-2 opacity-60">
              (
              {s.value === "ALL"
                ? bookings.length
                : bookings.filter((b) => b.status === s.value).length}
              )
            </span>
          </button>
        ))}
      </div>

      {/* Tabla de reservas */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-stone-400">Cargando reservas…</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-stone-400">
            No hay reservas en este estado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50">
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-stone-400 font-medium">
                    ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-stone-400 font-medium">
                    Huésped
                  </th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-stone-400 font-medium">
                    Habitación
                  </th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-stone-400 font-medium">
                    Check-in
                  </th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-stone-400 font-medium">
                    Check-out
                  </th>
                  <th className="px-4 py-3 text-right text-xs uppercase tracking-wider text-stone-400 font-medium">
                    Total
                  </th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-stone-400 font-medium">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-stone-400 font-medium">
                    Canal
                  </th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-stone-400 font-medium">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {filtered.map((booking) => {
                  const nights = getNights(
                    booking.checkInDate,
                    booking.checkOutDate
                  );
                  const isUpdating = updating === booking.id;

                  return (
                    <tr key={booking.id} className="table-row-hover">
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-stone-400">
                          #{booking.id.slice(-6).toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-stone-800">
                          {booking.guest.firstName} {booking.guest.lastName}
                        </p>
                        <p className="text-xs text-stone-400">
                          {booking.guest.email}
                        </p>
                        <p className="text-xs text-stone-300">
                          {booking.guest.documentId}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-stone-700">{booking.room.name}</p>
                        <p className="text-xs text-stone-400">
                          {booking.adults} ad.
                          {booking.children > 0
                            ? ` + ${booking.children} niños`
                            : ""}{" "}
                          · {nights} noche{nights !== 1 ? "s" : ""}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-stone-600">
                        {formatDate(booking.checkInDate)}
                      </td>
                      <td className="px-4 py-3 text-stone-600">
                        {formatDate(booking.checkOutDate)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <p className="font-medium text-stone-800">
                          {formatCurrency(booking.totalAmount)}
                        </p>
                        {booking.depositPaid && (
                          <p className="text-xs text-emerald-600">✓ Pagado</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`badge ${STATUS_COLORS[booking.status]}`}
                        >
                          {STATUS_LABELS[booking.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-stone-400">
                          {SOURCE_LABELS[booking.source] ?? booking.source}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {booking.status === "PENDING" && (
                            <button
                              onClick={() =>
                                handleStatusChange(
                                  booking.id,
                                  "CONFIRMED",
                                  true
                                )
                              }
                              disabled={isUpdating}
                              className="text-xs bg-emerald-600 text-white px-2 py-1 hover:bg-emerald-700 transition-colors disabled:opacity-50"
                            >
                              Confirmar
                            </button>
                          )}
                          {booking.status === "CONFIRMED" && (
                            <button
                              onClick={() =>
                                handleStatusChange(booking.id, "CHECKED_IN")
                              }
                              disabled={isUpdating}
                              className="text-xs bg-blue-600 text-white px-2 py-1 hover:bg-blue-700 transition-colors disabled:opacity-50"
                            >
                              Check-in
                            </button>
                          )}
                          {booking.status === "CHECKED_IN" && (
                            <button
                              onClick={() =>
                                handleStatusChange(booking.id, "CHECKED_OUT")
                              }
                              disabled={isUpdating}
                              className="text-xs bg-stone-600 text-white px-2 py-1 hover:bg-stone-700 transition-colors disabled:opacity-50"
                            >
                              Check-out
                            </button>
                          )}
                          {!["CANCELLED", "CHECKED_OUT"].includes(
                            booking.status
                          ) && (
                            <button
                              onClick={() => handleCancel(booking.id)}
                              disabled={isUpdating}
                              className="text-xs text-red-600 hover:text-red-800 transition-colors disabled:opacity-50"
                            >
                              Cancelar
                            </button>
                          )}
                        </div>
                      </td>
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
