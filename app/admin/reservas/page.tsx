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
  isPastFreeCancellation,
  getRoomDisplayName,
} from "@/lib/utils";

interface Booking {
  id: string;
  roomId: string | null;
  roomType: string;
  checkInDate: string;
  checkOutDate: string;
  status: string;
  source: string;
  totalAmount: string;
  depositPaid: boolean;
  stripePaymentMethodId: string | null;
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
  } | null;
  invoices: { id: string }[];
  precheckinCompletedAt: string | null;
  sesSubmittedAt: string | null;
  sesSubmissionError: string | null;
  guestAccessCodeSetAt: string | null;
  guestDisplayName: string | null;
  guestAccessCodePlain: string | null;
}

export default function AdminReservasPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [updating, setUpdating] = useState<string | null>(null);
  const [charging, setCharging] = useState<string | null>(null);
  const [chargeError, setChargeError] = useState<{ id: string; message: string } | null>(null);
  const [invoicing, setInvoicing] = useState<string | null>(null);
  const [sendingSes, setSendingSes] = useState<string | null>(null);
  const [resendingEmail, setResendingEmail] = useState<string | null>(null);
  const [generatingGuestAccess, setGeneratingGuestAccess] = useState<string | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchBookings();
    fetchUnreadCounts();
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

  const fetchUnreadCounts = async () => {
    try {
      const res = await fetch("/api/bookings/unread-counts");
      const data = await res.json();
      setUnreadCounts(data.data ?? {});
    } catch {
      // no bloqueante: el badge simplemente no aparece
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

  const handleCharge = async (id: string, totalAmount: string) => {
    if (!confirm(`¿Cobrar ${formatCurrency(totalAmount)} a la tarjeta guardada de esta reserva?`))
      return;
    setCharging(id);
    setChargeError(null);
    try {
      const res = await fetch(`/api/bookings/${id}/charge`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setChargeError({ id, message: data.error ?? "Error al cobrar." });
        return;
      }
      await fetchBookings();
    } finally {
      setCharging(null);
    }
  };

  const handleResendEmail = async (id: string) => {
    setResendingEmail(id);
    try {
      const res = await fetch(`/api/bookings/${id}/resend-email`, { method: "POST" });
      const data = await res.json();
      alert(res.ok ? data.message : data.error);
    } finally {
      setResendingEmail(null);
    }
  };

  const handleCopyPrecheckinLink = async (id: string) => {
    const link = `${window.location.origin}/precheckin/${id}`;
    await navigator.clipboard.writeText(link);
    alert("Enlace de precheckin copiado al portapapeles.");
  };

  const handleGenerateGuestAccess = async (id: string, hasCode: boolean) => {
    if (
      hasCode &&
      !confirm(
        "Ya hay un código activo para esta reserva. Generar uno nuevo invalidará el acceso del huésped actual (y volverá a pedirle el nombre la próxima vez). ¿Continuar?"
      )
    )
      return;

    setGeneratingGuestAccess(id);
    try {
      const res = await fetch(`/api/bookings/${id}/guest-access`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "Error al generar el código.");
        return;
      }
      const code: string = data.data.code;
      await navigator.clipboard.writeText(code).catch(() => {});
      alert(
        `Código de acceso a la app de huéspedes: ${code}\n\n` +
          "Compártelo con el huésped (de palabra, en una tarjeta o por email). " +
          "No podrás volver a verlo — ya se ha copiado al portapapeles.\n\n" +
          "Se ha invalidado cualquier código anterior de esta reserva."
      );
      await fetchBookings();
    } finally {
      setGeneratingGuestAccess(null);
    }
  };

  const handleSendSes = async (id: string) => {
    setSendingSes(id);
    try {
      const res = await fetch(`/api/bookings/${id}/ses-submit`, { method: "POST" });
      const data = await res.json();
      alert(res.ok ? data.message : data.error);
      await fetchBookings();
    } finally {
      setSendingSes(null);
    }
  };

  const handleInvoice = async (id: string) => {
    setInvoicing(id);
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: id }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "Error al crear la factura.");
        return;
      }
      window.open(`/api/invoices/${data.data.id}/pdf`, "_blank");
      await fetchBookings();
    } finally {
      setInvoicing(null);
    }
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
            className={`filter-chip ${
              filter === s.value
                ? "bg-villalen-600 text-white border-villalen-600"
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
                        <Link
                          href={`/admin/reservas/${booking.id}`}
                          className="font-medium text-stone-800 hover:text-villalen-700 hover:underline"
                        >
                          {booking.guest.firstName} {booking.guest.lastName}
                        </Link>
                        {unreadCounts[booking.id] > 0 && (
                          <span className="ml-2 inline-flex items-center justify-center rounded-full bg-terracotta-500 text-white text-[10px] font-semibold w-4 h-4 align-middle">
                            {unreadCounts[booking.id]}
                          </span>
                        )}
                        <p className="text-xs text-stone-400">
                          {booking.guest.email}
                        </p>
                        <p className="text-xs text-stone-300">
                          {booking.guest.documentId}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-stone-700">
                          {getRoomDisplayName(booking)}
                          {!booking.roomId && (
                            <span className="badge bg-amber-100 text-amber-800 border-amber-200 ml-2">
                              Sin asignar
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-stone-400">
                          {booking.adults} ad.
                          {booking.children > 0
                            ? ` + ${booking.children} niños`
                            : ""}{" "}
                          · {nights} noche{nights !== 1 ? "s" : ""}
                        </p>
                        {booking.precheckinCompletedAt && (
                          <span className="text-xs text-emerald-600 block">✓ Precheckin</span>
                        )}
                        {booking.sesSubmittedAt && (
                          <span className="text-xs text-emerald-600 block">✓ Enviado a Policía</span>
                        )}
                        {booking.sesSubmissionError && !booking.sesSubmittedAt && (
                          <span className="text-xs text-red-600 block" title={booking.sesSubmissionError}>
                            ⚠ Error envío Policía
                          </span>
                        )}
                        {booking.guestAccessCodePlain ? (
                          <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded block w-fit">
                            🔑 Código de hoy: {booking.guestAccessCodePlain}
                          </span>
                        ) : (
                          booking.guestAccessCodeSetAt && (
                            <span className="text-xs text-villalen-600 block">
                              🔑 App{booking.guestDisplayName ? ` · ${booking.guestDisplayName}` : " (código sin usar)"}
                            </span>
                          )
                        )}
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
                        {booking.depositPaid ? (
                          <p className="text-xs text-emerald-600">✓ Pagado</p>
                        ) : (
                          booking.stripePaymentMethodId &&
                          !["CANCELLED", "CHECKED_OUT"].includes(booking.status) &&
                          isPastFreeCancellation(booking.checkInDate) && (
                            <p className="text-xs text-amber-600">⚠ Plazo cancelación vencido</p>
                          )
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
                        <div className="flex items-center gap-2 flex-wrap">
                          {!["CANCELLED", "CHECKED_OUT"].includes(booking.status) && (
                            <button
                              onClick={() => handleCopyPrecheckinLink(booking.id)}
                              className="chip bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                            >
                              🔗 Precheckin
                            </button>
                          )}
                          {!["CANCELLED", "CHECKED_OUT"].includes(booking.status) && (
                            <button
                              onClick={() =>
                                handleGenerateGuestAccess(booking.id, Boolean(booking.guestAccessCodeSetAt))
                              }
                              disabled={generatingGuestAccess === booking.id}
                              className="chip bg-villalen-50 text-villalen-800 border-villalen-200 hover:bg-villalen-200"
                            >
                              {generatingGuestAccess === booking.id
                                ? "Generando…"
                                : booking.guestAccessCodeSetAt
                                  ? "🔑 Regenerar código app"
                                  : "🔑 Código app huésped"}
                            </button>
                          )}
                          <button
                            onClick={() => handleResendEmail(booking.id)}
                            disabled={resendingEmail === booking.id}
                            className="chip bg-stone-100 text-stone-600 border-stone-200 hover:bg-stone-200"
                          >
                            {resendingEmail === booking.id ? "Enviando…" : "📧 Reenviar email"}
                          </button>
                          {!booking.sesSubmittedAt &&
                            !["CANCELLED"].includes(booking.status) && (
                              <button
                                onClick={() => handleSendSes(booking.id)}
                                disabled={sendingSes === booking.id}
                                className="chip bg-stone-700 text-white border-transparent hover:bg-stone-800"
                              >
                                {sendingSes === booking.id ? "Enviando…" : "📤 Enviar a Policía"}
                              </button>
                            )}
                          {booking.stripePaymentMethodId &&
                            !booking.depositPaid &&
                            !["CANCELLED", "CHECKED_OUT"].includes(booking.status) && (
                              <button
                                onClick={() => handleCharge(booking.id, booking.totalAmount)}
                                disabled={charging === booking.id}
                                className="chip bg-terracotta-600 text-white border-transparent hover:bg-terracotta-700"
                              >
                                {charging === booking.id ? "Cobrando…" : "💳 Cobrar ahora"}
                              </button>
                            )}
                          {["CONFIRMED", "CHECKED_IN", "CHECKED_OUT"].includes(booking.status) &&
                            booking.invoices.length === 0 && (
                              <button
                                onClick={() => handleInvoice(booking.id)}
                                disabled={invoicing === booking.id}
                                className="chip bg-stone-700 text-white border-transparent hover:bg-stone-800"
                              >
                                {invoicing === booking.id ? "Facturando…" : "🧾 Facturar"}
                              </button>
                            )}
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
                              className="chip bg-sage-600 text-white border-transparent hover:bg-sage-700"
                            >
                              Confirmar
                            </button>
                          )}
                          {booking.status === "CONFIRMED" && (
                            <button
                              onClick={() =>
                                handleStatusChange(booking.id, "CHECKED_IN")
                              }
                              disabled={isUpdating || !booking.roomId}
                              title={!booking.roomId ? "Asigna una habitación antes de hacer el check-in." : undefined}
                              className="chip bg-villalen-600 text-white border-transparent hover:bg-villalen-800 disabled:opacity-40 disabled:cursor-not-allowed"
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
                              className="chip bg-stone-600 text-white border-transparent hover:bg-stone-700"
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
                              className="chip bg-white text-red-600 border-red-200 hover:bg-red-50"
                            >
                              Cancelar
                            </button>
                          )}
                        </div>
                        {chargeError?.id === booking.id && (
                          <p className="text-xs text-red-600 mt-1">{chargeError.message}</p>
                        )}
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
