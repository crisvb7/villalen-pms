"use client";
// app/admin/gastos/page.tsx

import { useEffect, useState } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { formatDate, formatCurrency } from "@/lib/utils";

interface Expense {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: string;
  paymentMethod: string;
  supplier: string | null;
}

const CATEGORY_SUGGESTIONS = ["Suministros", "Mantenimiento", "Limpieza", "Proveedores", "Otros"];
const PAYMENT_LABELS: Record<string, string> = {
  CASH: "Efectivo",
  CARD: "Tarjeta",
  TRANSFER: "Transferencia",
  OTHER: "Otro",
};

const emptyForm = {
  date: format(new Date(), "yyyy-MM-dd"),
  category: "",
  description: "",
  amount: "",
  paymentMethod: "OTHER",
  supplier: "",
};

export default function GastosPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [month, setMonth] = useState(format(new Date(), "yyyy-MM"));

  useEffect(() => {
    fetchExpenses();
  }, [month]);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const monthDate = new Date(`${month}-01T00:00:00`);
      const from = format(startOfMonth(monthDate), "yyyy-MM-dd");
      const to = format(endOfMonth(monthDate), "yyyy-MM-dd");
      const res = await fetch(`/api/expenses?from=${from}&to=${to}`);
      const data = await res.json();
      setExpenses(data.data ?? []);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          amount: Number(form.amount),
          supplier: form.supplier || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "Error al crear el gasto.");
        return;
      }
      setForm(emptyForm);
      setShowForm(false);
      await fetchExpenses();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este gasto?")) return;
    await fetch(`/api/expenses/${id}`, { method: "DELETE" });
    await fetchExpenses();
  };

  const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="font-serif text-3xl text-stone-800">Gastos</h1>
          <p className="text-sm text-stone-500 mt-1">
            {expenses.length} gasto(s) · Total del mes: {formatCurrency(total)}
          </p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm">
          {showForm ? "Cancelar" : "+ Nuevo gasto"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="card p-6 mb-6">
          <h3 className="font-serif text-xl text-stone-800 mb-4">Nuevo gasto</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="label mb-2">Fecha *</label>
              <input
                type="date"
                className="input"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label mb-2">Categoría *</label>
              <input
                type="text"
                className="input"
                list="expense-categories"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                required
              />
              <datalist id="expense-categories">
                {CATEGORY_SUGGESTIONS.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="label mb-2">Importe (€) *</label>
              <input
                type="number"
                className="input"
                min="0.01"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="label mb-2">Método de pago</label>
              <select
                className="input"
                value={form.paymentMethod}
                onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
              >
                {Object.entries(PAYMENT_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label mb-2">Proveedor</label>
              <input
                type="text"
                className="input"
                value={form.supplier}
                onChange={(e) => setForm({ ...form, supplier: e.target.value })}
              />
            </div>
          </div>
          <div className="mb-6">
            <label className="label mb-2">Descripción *</label>
            <input
              type="text"
              className="input"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              required
            />
          </div>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Guardando…" : "Crear gasto"}
          </button>
        </form>
      )}

      <div className="mb-4">
        <label className="label mb-2">Mes</label>
        <input
          type="month"
          className="input max-w-[200px]"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
        />
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-stone-400">Cargando gastos…</div>
        ) : expenses.length === 0 ? (
          <div className="p-12 text-center text-stone-400">No hay gastos en este mes.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50">
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-stone-400 font-medium">Fecha</th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-stone-400 font-medium">Categoría</th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-stone-400 font-medium">Descripción</th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-stone-400 font-medium">Método</th>
                  <th className="px-4 py-3 text-right text-xs uppercase tracking-wider text-stone-400 font-medium">Importe</th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-stone-400 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {expenses.map((expense) => (
                  <tr key={expense.id} className="table-row-hover">
                    <td className="px-4 py-3 text-stone-600">{formatDate(expense.date)}</td>
                    <td className="px-4 py-3 text-stone-700">{expense.category}</td>
                    <td className="px-4 py-3">
                      <p className="text-stone-800">{expense.description}</p>
                      {expense.supplier && <p className="text-xs text-stone-400">{expense.supplier}</p>}
                    </td>
                    <td className="px-4 py-3 text-xs text-stone-500">{PAYMENT_LABELS[expense.paymentMethod]}</td>
                    <td className="px-4 py-3 text-right font-medium text-stone-800">
                      {formatCurrency(expense.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDelete(expense.id)}
                        className="chip bg-white text-red-600 border-red-200 hover:bg-red-50"
                      >
                        Eliminar
                      </button>
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
