"use client";
// app/admin/facturas/page.tsx

import { useEffect, useState } from "react";
import { formatDate, formatCurrency } from "@/lib/utils";

interface Invoice {
  id: string;
  invoiceNumber: string;
  issueDate: string;
  total: string;
  isPaid: boolean;
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
                  <tr key={invoice.id} className="table-row-hover">
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
