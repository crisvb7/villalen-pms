"use client";
// app/admin/facturas/page.tsx

import { Fragment, useEffect, useState } from "react";
import { formatDate, formatCurrency } from "@/lib/utils";

interface InvoiceExtra {
  id: string;
  description: string;
  amount: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  issueDate: string;
  total: string;
  isPaid: boolean;
  extras: InvoiceExtra[];
  booking: {
    checkInDate: string;
    checkOutDate: string;
    guest: { firstName: string; lastName: string; email: string };
    room: { name: string };
  };
}

export default function FacturasPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [extraForm, setExtraForm] = useState({ description: "", amount: "" });
  const [savingExtra, setSavingExtra] = useState(false);
  const [extraError, setExtraError] = useState<string | null>(null);

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
        body: JSON.stringify({ isPaid: true }),
      });
      await fetchInvoices();
    } finally {
      setUpdating(null);
    }
  };

  const toggleExpanded = (id: string) => {
    setExtraError(null);
    setExtraForm({ description: "", amount: "" });
    setExpanded(expanded === id ? null : id);
  };

  const handleAddExtra = async (invoiceId: string) => {
    setExtraError(null);
    const amount = Number(extraForm.amount);
    if (!extraForm.description.trim() || !(amount > 0)) {
      setExtraError("Indica una descripción y un importe mayor que 0.");
      return;
    }
    setSavingExtra(true);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/extras`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: extraForm.description.trim(), amount }),
      });
      const data = await res.json();
      if (!res.ok) {
        setExtraError(data.error ?? "Error al añadir el servicio.");
        return;
      }
      setExtraForm({ description: "", amount: "" });
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
                    <td className="px-4 py-3 text-stone-700">{invoice.booking.room.name}</td>
                    <td className="px-4 py-3 text-right font-medium text-stone-800">
                      {formatCurrency(invoice.total)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`badge ${
                          invoice.isPaid
                            ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                            : "bg-amber-100 text-amber-800 border-amber-200"
                        }`}
                      >
                        {invoice.isPaid ? "Pagada" : "Pendiente"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <a
                          href={`/api/invoices/${invoice.id}/pdf`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs bg-stone-700 text-white px-2 py-1 hover:bg-stone-800 transition-colors"
                        >
                          📄 PDF
                        </a>
                        <button
                          onClick={() => toggleExpanded(invoice.id)}
                          className="text-xs bg-amber-50 text-amber-800 border border-amber-200 px-2 py-1 hover:bg-amber-100 transition-colors font-medium"
                        >
                          {invoice.extras.length > 0
                            ? `🍽️ Servicios (${invoice.extras.length})`
                            : "+ Añadir servicio (desayuno, etc.)"}
                        </button>
                        {!invoice.isPaid && (
                          <button
                            onClick={() => handleMarkPaid(invoice.id)}
                            disabled={updating === invoice.id}
                            className="text-xs bg-emerald-600 text-white px-2 py-1 hover:bg-emerald-700 transition-colors disabled:opacity-50"
                          >
                            Marcar pagada
                          </button>
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
                                className="flex items-center justify-between text-sm bg-white border border-stone-100 px-3 py-1.5 max-w-md"
                              >
                                <span className="text-stone-700">{extra.description}</span>
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
                          <div className="flex items-end gap-2 max-w-md">
                            <div className="flex-1">
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
                            <div className="w-28">
                              <label className="block text-xs text-stone-400 mb-1">Importe €</label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={extraForm.amount}
                                onChange={(e) => setExtraForm((f) => ({ ...f, amount: e.target.value }))}
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
