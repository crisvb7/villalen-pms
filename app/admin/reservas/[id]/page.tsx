// app/admin/reservas/[id]/page.tsx
// Detalle de una reserva: lo que el huésped pidió desde la app (desayuno,
// cena, limpieza por día) y el chat con recepción — visible y editable por
// el personal, mismo dato que ve/edita la app de huéspedes.
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { addDays, format } from "date-fns";
import {
  cn,
  formatDate,
  formatCurrency,
  STATUS_LABELS,
  STATUS_COLORS,
  getRoomDisplayName,
} from "@/lib/utils";

const SERVICE_META: { type: "BREAKFAST" | "DINNER" | "CLEANING"; label: string; icon: string }[] = [
  { type: "BREAKFAST", label: "Desayuno", icon: "🍳" },
  { type: "DINNER", label: "Cena", icon: "🍽️" },
  { type: "CLEANING", label: "Limpieza", icon: "🧹" },
];

interface Booking {
  id: string;
  status: string;
  checkInDate: string;
  checkOutDate: string;
  totalAmount: string;
  guest: { firstName: string; lastName: string; email: string; phone: string | null };
  room: { name: string } | null;
  roomType: string;
}

interface ServiceRequest {
  id: string;
  date: string;
  type: "BREAKFAST" | "DINNER" | "CLEANING";
  status: "REQUESTED" | "CANCELLED";
}

interface Message {
  id: string;
  sender: "GUEST" | "STAFF";
  body: string;
  createdAt: string;
}

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [services, setServices] = useState<ServiceRequest[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [messageBody, setMessageBody] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    const [bRes, sRes, mRes] = await Promise.all([
      fetch(`/api/bookings/${id}`),
      fetch(`/api/bookings/${id}/services`),
      fetch(`/api/bookings/${id}/messages`),
    ]);
    const [bData, sData, mData] = await Promise.all([bRes.json(), sRes.json(), mRes.json()]);
    setBooking(bData.data ?? null);
    setServices(sData.data ?? []);
    setMessages(mData.data ?? []);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleService(dateStr: string, type: string, next: boolean) {
    const key = `${dateStr}-${type}`;
    setToggling(key);
    try {
      const res = await fetch(`/api/bookings/${id}/services`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: dateStr, type, requested: next }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "No se pudo actualizar.");
        return;
      }
      setServices((prev) => {
        const idx = prev.findIndex(
          (r) => r.date.slice(0, 10) === dateStr && r.type === type
        );
        if (idx === -1) return [...prev, data.data];
        const copy = [...prev];
        copy[idx] = data.data;
        return copy;
      });
    } finally {
      setToggling(null);
    }
  }

  async function sendMessage() {
    const body = messageBody.trim();
    if (!body) return;
    setSending(true);
    try {
      const res = await fetch(`/api/bookings/${id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "No se pudo enviar el mensaje.");
        return;
      }
      setMessages((prev) => [...prev, data.data]);
      setMessageBody("");
    } finally {
      setSending(false);
    }
  }

  if (loading || !booking) {
    return <p className="text-stone-400">Cargando…</p>;
  }

  const nights: string[] = [];
  for (
    let cursor = new Date(booking.checkInDate);
    cursor < new Date(booking.checkOutDate);
    cursor = addDays(cursor, 1)
  ) {
    nights.push(format(cursor, "yyyy-MM-dd"));
  }

  function isRequested(dateStr: string, type: string) {
    return services.some(
      (r) => r.date.slice(0, 10) === dateStr && r.type === type && r.status === "REQUESTED"
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <Link href="/admin/reservas" className="text-sm text-stone-400 hover:text-stone-700">
        ← Volver a reservas
      </Link>

      <div className="card">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="font-serif text-2xl text-stone-800">
            {booking.guest.firstName} {booking.guest.lastName}
          </h1>
          <span className={`badge ${STATUS_COLORS[booking.status]}`}>
            {STATUS_LABELS[booking.status]}
          </span>
        </div>
        <p className="text-stone-500 text-sm mt-1">
          {getRoomDisplayName(booking)} · {formatDate(booking.checkInDate)} →{" "}
          {formatDate(booking.checkOutDate)} · {formatCurrency(booking.totalAmount)}
        </p>
        <p className="text-stone-400 text-xs mt-1">
          {booking.guest.email}
          {booking.guest.phone ? ` · ${booking.guest.phone}` : ""}
        </p>
      </div>

      <section className="card">
        <h2 className="font-medium text-stone-700 mb-4">Servicios diarios</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth: 480 }}>
            <thead>
              <tr>
                <th className="text-left py-2 pr-4 text-stone-400 font-medium whitespace-nowrap">Día</th>
                {SERVICE_META.map((meta) => (
                  <th
                    key={meta.type}
                    className="text-center py-2 px-3 text-stone-400 font-medium whitespace-nowrap"
                  >
                    {meta.icon} {meta.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {nights.map((dateStr) => (
                <tr key={dateStr} className="border-t border-stone-100">
                  <td className="py-2 pr-4 text-stone-600 whitespace-nowrap">{formatDate(dateStr)}</td>
                  {SERVICE_META.map((meta) => {
                    const active = isRequested(dateStr, meta.type);
                    const key = `${dateStr}-${meta.type}`;
                    return (
                      <td key={meta.type} className="text-center py-2 px-3">
                        <button
                          disabled={toggling === key}
                          onClick={() => toggleService(dateStr, meta.type, !active)}
                          className={cn(
                            "chip whitespace-nowrap",
                            active
                              ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                              : "bg-stone-100 text-stone-500 border-stone-200",
                            toggling === key && "opacity-60"
                          )}
                        >
                          {active ? "Sí" : "No"}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <h2 className="font-medium text-stone-700 mb-4">Chat con el huésped</h2>
        <div className="space-y-2 max-h-80 overflow-y-auto mb-4 pr-1">
          {messages.length === 0 && (
            <p className="text-stone-400 text-sm">Todavía no hay mensajes.</p>
          )}
          {messages.map((m) => (
            <div
              key={m.id}
              className={cn(
                "max-w-[75%] rounded-lg px-3 py-2 text-sm",
                m.sender === "STAFF"
                  ? "ml-auto bg-villalen-600 text-white"
                  : "bg-stone-100 text-stone-800"
              )}
            >
              <p>{m.body}</p>
              <p className="text-[10px] opacity-70 mt-1">
                {new Date(m.createdAt).toLocaleString("es-ES")}
              </p>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={messageBody}
            onChange={(e) => setMessageBody(e.target.value)}
            placeholder="Escribe una respuesta…"
            className="input flex-1"
            onKeyDown={(e) => {
              if (e.key === "Enter") sendMessage();
            }}
          />
          <button
            onClick={sendMessage}
            disabled={sending || !messageBody.trim()}
            className="btn-primary"
          >
            Enviar
          </button>
        </div>
      </section>
    </div>
  );
}
