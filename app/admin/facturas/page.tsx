"use client";
// app/admin/facturas/page.tsx

import { Fragment, useEffect, useState } from "react";
import { formatDate, formatCurrency, PAYMENT_METHOD_LABELS, ROOM_TYPE_LABELS } from "@/lib/utils";

interface InvoiceExtra {
  id: string;
  description: string;
  amount: string;
  quantity: number;
  date: string | null;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  issueDate: string;
  total: string;
  isPaid: boolean;
  paymentMethod: string | null;
  extras: InvoiceExtra[];
  booking: {
    checkInDate: string;
    checkOutDate: string;
    roomType: string;
    guest: { firstName: string; lastName: string; email: string };
    room: { name: string } | null;
  };
}

const PAYMENT_METHOD_OPTIONS = ["CARD", "CASH", "TRANSFER", "OTHER"];

export default function FacturasPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [extraForm, setExtraForm] = useState({ description: "", unitAmount: "", quantity: "1", date: "" });
  const [savingExtra, setSavingExtra] = useState(false);
  const [extraError, setExtraError] = useState<string | null>(null);
  const [paymentSelection, setPaymentSelection] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/invoices");
      const data = await res.json();
      setInvoices(data.data ?? []);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkPaid = async (id: string) => {
    setUpdating(id);
    try {
      await fetch(`/api/invoices/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPaid: true, paymentMethod: paymentSelection[id] ?? "CARD" }),
      });
      await fetchInvoices();
    } finally {
      setUpdating(null);
    }
  };

  const toggleExpanded = (id: string) => {
    setExtraError(null);
    setExtraForm({ description: "", unitAmount: "", quantity: "1", date: "" });
    setExpanded(expanded === id ? null : id);
  };

  const handleAddExtra = async (invoiceId: string) => {
    setExtraError(null);
    const unitAmount = Number(extraForm.unitAmount);
    const quantity = Number(extraForm.quantity);
    if (!extraForm.description.trim() || !(unitAmount > 0)) {
      setExtraError("Indica una descripción y un precio unitario mayor que 0.");
      return;
    }
    if (!Number.isInteger(quantity) || quantity < 1) {
      setExtraError("La cantidad debe ser un número entero de al menos 1.");
      return;
    }
    setSavingExtra(true);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/extras`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: extraForm.description.trim(),
          amount: unitAmount * quantity,
          quantity,
          date: extraForm.date || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setExtraError(data.error ?? "Error al añadir el servicio.");
        return;
      }
      setExtraForm({ description: "", unitAmount: "", quantity: "1", date: "" });
      await fetchInvoices();
    } finally {
      setSavingExtra(false);
    }
  };

  const handleRemoveExtra = async (invoiceId: string, extraId: string) => {
    setSavingExtra(true);
    try {
      await fetch(`/api/invoices/${invoiceId}/extras/${extraId}`, { method: "DELETE" });
      await fetchInvoices();
    } finally {
      setSavingExtra(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-serif text-3xl text-stone-800">Facturas</h1>
        <p className="text-sm text-stone-500 mt-1">{invoices.length} factura(s)</p>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-stone-400">Cargando facturas…</div>
        ) : invoices.length === 0 ? (
          <div className="p-12 text-center text-stone-400">
            No hay facturas todavía. Se crean desde "Facturar" en Reservas.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50">
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-stone-400 font-medium">Nº Factura</th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-stone-400 font-medium">Fecha</th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-stone-400 font-medium">Huésped</th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-stone-400 font-medium">Habitación</th>
                  <th className="px-4 py-3 text-right text-xs uppercase tracking-wider text-stone-400 font-medium">Total</th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-stone-400 font-medium">Estado</th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-stone-400 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {invoices.map((invoice) => (
                  <Fragment key={invoice.id}>
                  <tr className="table-row-hover">
                    <td className="px-4 py-3 font-mono text-xs text-stone-600">{invoice.invoiceNumber}</td>
                    <td className="px-4 py-3 text-stone-600">{formatDate(invoice.issueDate)}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-stone-800">
                        {invoice.booking.guest.firstName} {invoice.booking.guest.lastName}
                      </p>
                      <p className="text-xs text-stone-400">{invoice.booking.guest.email}</p>
                    </td>
                    <td className="px-4 py-3 text-stone-700">
                      {invoice.booking.room?.name ?? ROOM_TYPE_LABELS[invoice.booking.roomType]}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-stone-800">
                      {formatCurrency(invoice.total)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`badge ${
                          invoice.isPaid
                            ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                            : "bg-terracotta-100 text-terracotta-800 border-terracotta-200"
                        }`}
                      >
                        {invoice.isPaid ? "Pagada" : "Pendiente"}
                      </span>
                      {invoice.isPaid && invoice.paymentMethod && (
                        <p className="text-xs text-stone-400 mt-1">
                          {PAYMENT_METHOD_LABELS[invoice.paymentMethod] ?? invoice.paymentMethod}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <a
                          href={`/api/invoices/${invoice.id}/pdf`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="chip bg-stone-700 text-white border-transparent hover:bg-stone-800"
                        >
                          📄 PDF
                        </a>
                        <button
                          onClick={() => toggleExpanded(invoice.id)}
                          className="chip bg-terracotta-50 text-terracotta-800 border-terracotta-200 hover:bg-terracotta-100"
                        >
                          {invoice.extras.length > 0
                            ? `🍴 Servicios (${invoice.extras.length})`
                            : "+ Añadir servicio (desayuno, etc.)"}
                        </button>
                        {!invoice.isPaid && (
                          <>
                            <select
                              value={paymentSelection[invoice.id] ?? "CARD"}
                              onChange={(e) =>
                                setPaymentSelection((s) => ({ ...s, [invoice.id]: e.target.value }))
                              }
                              className="input text-xs py-1.5 px-2 w-auto"
                            >
                              {PAYMENT_METHOD_OPTIONS.map((m) => (
                                <option key={m} value={m}>
                                  {PAYMENT_METHOD_LABELS[m]}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => handleMarkPaid(invoice.id)}
                              disabled={updating === invoice.id}
                              className="chip bg-sage-600 text-white border-transparent hover:bg-sage-700"
                            >
                              Marcar pagada
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expanded === invoice.id && (
                    <tr className="bg-stone-50/60">
                      <td colSpan={7} className="px-4 py-4">
                        <p className="text-xs uppercase tracking-wider text-stone-400 font-medium mb-2">
                          Servicios adicionales — {invoice.invoiceNumber}
                        </p>

                        {invoice.extras.length > 0 && (
                          <div className="mb-3 space-y-1">
                            {invoice.extras.map((extra) => (
                              <div
                                key={extra.id}
                                className="flex items-center justify-between text-sm bg-white border border-stone-100 rounded-lg px-3 py-1.5 max-w-md"
                              >
                                <span className="text-stone-700">
                                  {extra.description}
                                  {extra.quantity > 1 && (
                                    <span className="text-stone-400"> ×{extra.quantity}</span>
                                  )}
                                  {extra.date && (
                                    <span className="text-stone-400"> · {formatDate(extra.date)}</span>
                                  )}
                                </span>
                                <div className="flex items-center gap-3">
                                  <span className="font-medium text-stone-800">
                                    {formatCurrency(extra.amount)}
                                  </span>
                                  {!invoice.isPaid && (
                                    <button
                                      onClick={() => handleRemoveExtra(invoice.id, extra.id)}
                                      disabled={savingExtra}
                                      className="text-red-500 hover:text-red-700 disabled:opacity-50"
                                      aria-label="Quitar servicio"
                                    >
                                      ×
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {invoice.isPaid ? (
                          <p className="text-xs text-stone-400">
                            Esta factura ya está pagada; no se pueden modificar sus servicios.
                          </p>
                        ) : (
                          <div className="flex flex-wrap items-end gap-2 max-w-2xl">
                            <div className="flex-1 min-w-[160px]">
                              <label className="block text-xs text-stone-400 mb-1">Descripción</label>
                              <input
                                type="text"
                                value={extraForm.description}
                                onChange={(e) =>
                                  setExtraForm((f) => ({ ...f, description: e.target.value }))
                                }
                                placeholder="Desayuno, minibar…"
                                className="input w-full text-sm"
                              />
                            </div>
                            <div className="w-24">
                              <label className="block text-xs text-stone-400 mb-1">Precio unidad €</label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={extraForm.unitAmount}
                                onChange={(e) =>
                                  setExtraForm((f) => ({ ...f, unitAmount: e.target.value }))
                                }
                                className="input w-full text-sm"
                              />
                            </div>
                            <div className="w-20">
                              <label className="block text-xs text-stone-400 mb-1">Cantidad</label>
                              <input
                                type="number"
                                step="1"
                                min="1"
                                value={extraForm.quantity}
                                onChange={(e) =>
                                  setExtraForm((f) => ({ ...f, quantity: e.target.value }))
                                }
                                className="input w-full text-sm"
                              />
                            </div>
                            <div className="w-36">
                              <label className="block text-xs text-stone-400 mb-1">Fecha (opcional)</label>
                              <input
                                type="date"
                                value={extraForm.date}
                                onChange={(e) => setExtraForm((f) => ({ ...f, date: e.target.value }))}
                                className="input w-full text-sm"
                              />
                            </div>
                            <button
                              onClick={() => handleAddExtra(invoice.id)}
                              disabled={savingExtra}
                              className="btn-primary text-xs px-3 py-2 disabled:opacity-50"
                            >
                              Añadir
                            </button>
                          </div>
                        )}
                        {extraError && <p className="text-xs text-red-600 mt-2">{extraError}</p>}
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
