"use client";
// app/admin/presupuestos/page.tsx

import { Fragment, useEffect, useState } from "react";
import { format, addDays } from "date-fns";
import {
  formatDate,
  formatCurrency,
  QUOTE_STATUS_LABELS,
  QUOTE_STATUS_COLORS,
} from "@/lib/utils";

interface Room {
  id: string;
  name: string;
  basePrice: string;
}

interface Quote {
  id: string;
  quoteNumber: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string | null;
  roomName: string;
  pricePerNight: string;
  checkInDate: string;
  checkOutDate: string;
  total: string;
  status: string;
  validUntil: string;
  convertedBookingId: string | null;
}

const emptyForm = {
  guestName: "",
  guestEmail: "",
  guestPhone: "",
  roomId: "",
  roomName: "",
  pricePerNight: "",
  checkInDate: "",
  checkOutDate: "",
  validUntil: format(addDays(new Date(), 15), "yyyy-MM-dd"),
  notes: "",
};

const emptyConvertForm = {
  roomId: "",
  adults: "2",
  children: "0",
  firstName: "",
  lastName: "",
  documentId: "",
  email: "",
  phone: "",
  nationality: "ES",
};

export default function PresupuestosPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [convertForm, setConvertForm] = useState(emptyConvertForm);
  const [converting, setConverting] = useState(false);
  const [convertError, setConvertError] = useState("");

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [quotesRes, roomsRes] = await Promise.all([
        fetch("/api/quotes"),
        fetch("/api/rooms"),
      ]);
      const quotesData = await quotesRes.json();
      const roomsData = await roomsRes.json();
      setQuotes(quotesData.data ?? []);
      setRooms(roomsData.data ?? []);
    } finally {
      setLoading(false);
    }
  };

  const handleRoomSelect = (roomId: string) => {
    const room = rooms.find((r) => r.id === roomId);
    setForm({
      ...form,
      roomId,
      roomName: room?.name ?? form.roomName,
      pricePerNight: room?.basePrice ?? form.pricePerNight,
    });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestName: form.guestName,
          guestEmail: form.guestEmail,
          guestPhone: form.guestPhone || undefined,
          roomName: form.roomName,
          pricePerNight: Number(form.pricePerNight),
          checkInDate: form.checkInDate,
          checkOutDate: form.checkOutDate,
          validUntil: form.validUntil,
          notes: form.notes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "Error al crear el presupuesto.");
        return;
      }
      setForm(emptyForm);
      setShowForm(false);
      await fetchAll();
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    await fetch(`/api/quotes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await fetchAll();
  };

  const openConvertPanel = (quote: Quote) => {
    if (convertingId === quote.id) {
      setConvertingId(null);
      return;
    }
    setConvertingId(quote.id);
    setConvertError("");
    const matchingRoom = rooms.find((r) => r.name === quote.roomName);
    const [firstName, ...rest] = quote.guestName.split(" ");
    setConvertForm({
      ...emptyConvertForm,
      roomId: matchingRoom?.id ?? "",
      firstName: firstName ?? "",
      lastName: rest.join(" "),
      email: quote.guestEmail,
      phone: quote.guestPhone ?? "",
    });
  };

  const handleConvert = async (id: string) => {
    setConverting(true);
    setConvertError("");
    try {
      const res = await fetch(`/api/quotes/${id}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: convertForm.roomId,
          adults: Number(convertForm.adults),
          children: Number(convertForm.children),
          guest: {
            firstName: convertForm.firstName,
            lastName: convertForm.lastName,
            documentId: convertForm.documentId,
            email: convertForm.email,
            phone: convertForm.phone || undefined,
            nationality: convertForm.nationality || undefined,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setConvertError(data.error ?? "Error al convertir el presupuesto.");
        return;
      }
      setConvertingId(null);
      await fetchAll();
    } finally {
      setConverting(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="font-serif text-3xl text-stone-800">Presupuestos</h1>
          <p className="text-sm text-stone-500 mt-1">{quotes.length} presupuesto(s)</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm">
          {showForm ? "Cancelar" : "+ Nuevo presupuesto"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="card p-6 mb-6">
          <h3 className="font-serif text-xl text-stone-800 mb-4">Nuevo presupuesto</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="label mb-2">Nombre del cliente *</label>
              <input
                type="text"
                className="input"
                value={form.guestName}
                onChange={(e) => setForm({ ...form, guestName: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label mb-2">Email *</label>
              <input
                type="email"
                className="input"
                value={form.guestEmail}
                onChange={(e) => setForm({ ...form, guestEmail: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label mb-2">Teléfono</label>
              <input
                type="tel"
                className="input"
                value={form.guestPhone}
                onChange={(e) => setForm({ ...form, guestPhone: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="label mb-2">Habitación</label>
              <select
                className="input"
                value={form.roomId}
                onChange={(e) => handleRoomSelect(e.target.value)}
              >
                <option value="">— Elegir para autorrellenar —</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label mb-2">Nombre del alojamiento en el presupuesto *</label>
              <input
                type="text"
                className="input"
                value={form.roomName}
                onChange={(e) => setForm({ ...form, roomName: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="label mb-2">Precio/noche (€) *</label>
              <input
                type="number"
                className="input"
                min="1"
                step="0.01"
                value={form.pricePerNight}
                onChange={(e) => setForm({ ...form, pricePerNight: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label mb-2">Check-in *</label>
              <input
                type="date"
                className="input"
                value={form.checkInDate}
                onChange={(e) => setForm({ ...form, checkInDate: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label mb-2">Check-out *</label>
              <input
                type="date"
                className="input"
                value={form.checkOutDate}
                onChange={(e) => setForm({ ...form, checkOutDate: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label mb-2">Válido hasta *</label>
              <input
                type="date"
                className="input"
                value={form.validUntil}
                onChange={(e) => setForm({ ...form, validUntil: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="mb-6">
            <label className="label mb-2">Notas (opcional)</label>
            <textarea
              className="input resize-none"
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>

          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Guardando…" : "Crear presupuesto"}
          </button>
        </form>
      )}

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-stone-400">Cargando presupuestos…</div>
        ) : quotes.length === 0 ? (
          <div className="p-12 text-center text-stone-400">No hay presupuestos todavía.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50">
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-stone-400 font-medium">Nº</th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-stone-400 font-medium">Cliente</th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-stone-400 font-medium">Alojamiento</th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-stone-400 font-medium">Fechas</th>
                  <th className="px-4 py-3 text-right text-xs uppercase tracking-wider text-stone-400 font-medium">Total</th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-stone-400 font-medium">Estado</th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-stone-400 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {quotes.map((quote) => (
                  <Fragment key={quote.id}>
                    <tr className="table-row-hover">
                      <td className="px-4 py-3 font-mono text-xs text-stone-600">{quote.quoteNumber}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-stone-800">{quote.guestName}</p>
                        <p className="text-xs text-stone-400">{quote.guestEmail}</p>
                      </td>
                      <td className="px-4 py-3 text-stone-700">{quote.roomName}</td>
                      <td className="px-4 py-3 text-stone-600 text-xs">
                        {formatDate(quote.checkInDate)} → {formatDate(quote.checkOutDate)}
                        <p className="text-stone-400">Válido hasta {formatDate(quote.validUntil)}</p>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-stone-800">
                        {formatCurrency(quote.total)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`badge ${QUOTE_STATUS_COLORS[quote.status]}`}>
                          {QUOTE_STATUS_LABELS[quote.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <a
                            href={`/api/quotes/${quote.id}/pdf`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="chip bg-stone-700 text-white border-transparent hover:bg-stone-800"
                          >
                            📄 PDF
                          </a>
                          {quote.status === "DRAFT" && (
                            <button
                              onClick={() => handleStatusChange(quote.id, "SENT")}
                              className="chip bg-villalen-600 text-white border-transparent hover:bg-villalen-800"
                            >
                              Marcar enviado
                            </button>
                          )}
                          {["DRAFT", "SENT"].includes(quote.status) && (
                            <button
                              onClick={() => handleStatusChange(quote.id, "REJECTED")}
                              className="chip bg-white text-red-600 border-red-200 hover:bg-red-50"
                            >
                              Rechazar
                            </button>
                          )}
                          {!quote.convertedBookingId && (
                            <button
                              onClick={() => openConvertPanel(quote)}
                              className="chip bg-sage-600 text-white border-transparent hover:bg-sage-700"
                            >
                              ✓ Convertir en reserva
                            </button>
                          )}
                          {quote.convertedBookingId && (
                            <span className="badge bg-sage-100 text-sage-800 border-sage-200">✓ Convertido en reserva</span>
                          )}
                        </div>
                      </td>
                    </tr>
                    {convertingId === quote.id && (
                      <tr>
                        <td colSpan={7} className="px-4 py-4 bg-villalen-50/40 border-b border-stone-100">
                          <div className="max-w-3xl">
                            <p className="text-xs text-stone-500 mb-3">
                              Faltan estos datos para crear la reserva real: habitación de
                              inventario, documento de identidad y ocupación.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                              <div>
                                <label className="label mb-1">Habitación *</label>
                                <select
                                  className="input"
                                  value={convertForm.roomId}
                                  onChange={(e) => setConvertForm({ ...convertForm, roomId: e.target.value })}
                                  required
                                >
                                  <option value="">— Elegir —</option>
                                  {rooms.map((r) => (
                                    <option key={r.id} value={r.id}>
                                      {r.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="label mb-1">Adultos</label>
                                <input
                                  type="number"
                                  min="1"
                                  className="input"
                                  value={convertForm.adults}
                                  onChange={(e) => setConvertForm({ ...convertForm, adults: e.target.value })}
                                />
                              </div>
                              <div>
                                <label className="label mb-1">Niños</label>
                                <input
                                  type="number"
                                  min="0"
                                  className="input"
                                  value={convertForm.children}
                                  onChange={(e) => setConvertForm({ ...convertForm, children: e.target.value })}
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                              <div>
                                <label className="label mb-1">Nombre *</label>
                                <input
                                  type="text"
                                  className="input"
                                  value={convertForm.firstName}
                                  onChange={(e) => setConvertForm({ ...convertForm, firstName: e.target.value })}
                                  required
                                />
                              </div>
                              <div>
                                <label className="label mb-1">Apellidos *</label>
                                <input
                                  type="text"
                                  className="input"
                                  value={convertForm.lastName}
                                  onChange={(e) => setConvertForm({ ...convertForm, lastName: e.target.value })}
                                  required
                                />
                              </div>
                              <div>
                                <label className="label mb-1">DNI / NIE / Pasaporte *</label>
                                <input
                                  type="text"
                                  className="input"
                                  value={convertForm.documentId}
                                  onChange={(e) =>
                                    setConvertForm({ ...convertForm, documentId: e.target.value.toUpperCase() })
                                  }
                                  required
                                />
                              </div>
                            </div>
                            {convertError && (
                              <p className="mb-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">
                                {convertError}
                              </p>
                            )}
                            <div className="flex items-center gap-3">
                              <button
                                className="btn-primary text-sm"
                                disabled={converting || !convertForm.roomId}
                                onClick={() => handleConvert(quote.id)}
                              >
                                {converting ? "Convirtiendo…" : "Crear reserva"}
                              </button>
                              <button
                                className="btn-secondary text-sm"
                                onClick={() => setConvertingId(null)}
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
