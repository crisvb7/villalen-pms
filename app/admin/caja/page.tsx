"use client";
// app/admin/caja/page.tsx

import { useEffect, useState } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";

interface Movement {
  id: string;
  type: "INCOME" | "EXPENSE";
  concept: string;
  amount: string;
  createdAt: string;
}

interface CashSession {
  id: string;
  date: string;
  openingBalance: string;
  closingBalance: string | null;
  expectedBalance: string | null;
  difference: string | null;
  status: "OPEN" | "CLOSED";
  openedAt: string;
  closedAt: string | null;
  movements: Movement[];
}

export default function CajaPage() {
  const [session, setSession] = useState<CashSession | null>(null);
  const [history, setHistory] = useState<CashSession[]>([]);
  const [loading, setLoading] = useState(true);

  const [openingBalance, setOpeningBalance] = useState("");
  const [opening, setOpening] = useState(false);

  const [movementForm, setMovementForm] = useState({ type: "INCOME", concept: "", amount: "" });
  const [addingMovement, setAddingMovement] = useState(false);

  const [closingBalance, setClosingBalance] = useState("");
  const [closing, setClosing] = useState(false);
  const [closeResult, setCloseResult] = useState<CashSession | null>(null);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [openRes, historyRes] = await Promise.all([
        fetch("/api/cash-sessions?open=true"),
        fetch("/api/cash-sessions"),
      ]);
      const openData = await openRes.json();
      const historyData = await historyRes.json();
      setSession(openData.data ?? null);
      setHistory((historyData.data ?? []).filter((s: CashSession) => s.status === "CLOSED"));
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = async (e: React.FormEvent) => {
    e.preventDefault();
    setOpening(true);
    try {
      const res = await fetch("/api/cash-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ openingBalance: Number(openingBalance) }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "Error al abrir la caja.");
        return;
      }
      setOpeningBalance("");
      await fetchAll();
    } finally {
      setOpening(false);
    }
  };

  const handleAddMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    setAddingMovement(true);
    try {
      const res = await fetch(`/api/cash-sessions/${session.id}/movements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...movementForm, amount: Number(movementForm.amount) }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "Error al añadir el movimiento.");
        return;
      }
      setMovementForm({ type: "INCOME", concept: "", amount: "" });
      await fetchAll();
    } finally {
      setAddingMovement(false);
    }
  };

  const handleClose = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    if (!confirm("¿Cerrar la caja con el efectivo contado indicado?")) return;
    setClosing(true);
    try {
      const res = await fetch(`/api/cash-sessions/${session.id}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ closingBalance: Number(closingBalance) }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "Error al cerrar la caja.");
        return;
      }
      setCloseResult(data.data);
      setClosingBalance("");
      await fetchAll();
    } finally {
      setClosing(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-stone-400">Cargando caja…</div>;
  }

  const income =
    session?.movements.filter((m) => m.type === "INCOME").reduce((s, m) => s + Number(m.amount), 0) ?? 0;
  const expense =
    session?.movements.filter((m) => m.type === "EXPENSE").reduce((s, m) => s + Number(m.amount), 0) ?? 0;

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-serif text-3xl text-stone-800">Control de Caja</h1>
        <p className="text-sm text-stone-500 mt-1">Arqueo diario del efectivo en recepción</p>
      </div>

      {closeResult && (
        <div className="card p-6 mb-6 bg-terracotta-50 border-terracotta-200">
          <h3 className="font-serif text-lg text-stone-800 mb-3">Caja cerrada</h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs text-stone-400 uppercase">Esperado</p>
              <p className="font-medium text-stone-800">{formatCurrency(closeResult.expectedBalance ?? 0)}</p>
            </div>
            <div>
              <p className="text-xs text-stone-400 uppercase">Contado</p>
              <p className="font-medium text-stone-800">{formatCurrency(closeResult.closingBalance ?? 0)}</p>
            </div>
            <div>
              <p className="text-xs text-stone-400 uppercase">Diferencia</p>
              <p
                className={`font-medium ${
                  Number(closeResult.difference) === 0
                    ? "text-stone-800"
                    : Number(closeResult.difference) > 0
                    ? "text-emerald-600"
                    : "text-red-600"
                }`}
              >
                {formatCurrency(closeResult.difference ?? 0)}
              </p>
            </div>
          </div>
          <button onClick={() => setCloseResult(null)} className="btn-secondary text-sm mt-4">
            Cerrar aviso
          </button>
        </div>
      )}

      {!session ? (
        <form onSubmit={handleOpen} className="card p-6 max-w-md">
          <h3 className="font-serif text-xl text-stone-800 mb-4">Abrir caja</h3>
          <label className="label mb-2">Fondo inicial (€) *</label>
          <input
            type="number"
            className="input mb-4"
            min="0"
            step="0.01"
            value={openingBalance}
            onChange={(e) => setOpeningBalance(e.target.value)}
            required
          />
          <button type="submit" className="btn-primary w-full" disabled={opening}>
            {opening ? "Abriendo…" : "Abrir caja"}
          </button>
        </form>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="card p-6">
            <h3 className="font-serif text-lg text-stone-800 mb-4">Turno abierto</h3>
            <div className="grid grid-cols-3 gap-3 text-sm mb-6">
              <div>
                <p className="text-xs text-stone-400 uppercase">Fondo inicial</p>
                <p className="font-medium text-stone-800">{formatCurrency(session.openingBalance)}</p>
              </div>
              <div>
                <p className="text-xs text-stone-400 uppercase">Entradas</p>
                <p className="font-medium text-emerald-600">{formatCurrency(income)}</p>
              </div>
              <div>
                <p className="text-xs text-stone-400 uppercase">Salidas</p>
                <p className="font-medium text-red-600">{formatCurrency(expense)}</p>
              </div>
            </div>

            <form onSubmit={handleAddMovement} className="border-t border-stone-100 pt-4 mb-4">
              <p className="label mb-2">Añadir movimiento</p>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-2">
                <select
                  className="input"
                  value={movementForm.type}
                  onChange={(e) => setMovementForm({ ...movementForm, type: e.target.value })}
                >
                  <option value="INCOME">Entrada</option>
                  <option value="EXPENSE">Salida</option>
                </select>
                <input
                  type="text"
                  className="input md:col-span-2"
                  placeholder="Concepto"
                  value={movementForm.concept}
                  onChange={(e) => setMovementForm({ ...movementForm, concept: e.target.value })}
                  required
                />
                <input
                  type="number"
                  className="input"
                  placeholder="€"
                  min="0.01"
                  step="0.01"
                  value={movementForm.amount}
                  onChange={(e) => setMovementForm({ ...movementForm, amount: e.target.value })}
                  required
                />
              </div>
              <button type="submit" className="btn-secondary text-sm" disabled={addingMovement}>
                {addingMovement ? "Añadiendo…" : "+ Añadir"}
              </button>
            </form>

            <div className="max-h-56 overflow-y-auto divide-y divide-stone-50">
              {session.movements.length === 0 ? (
                <p className="text-xs text-stone-400 py-3">Sin movimientos todavía.</p>
              ) : (
                session.movements.map((m) => (
                  <div key={m.id} className="flex justify-between py-2 text-sm">
                    <span className="text-stone-600">{m.concept}</span>
                    <span className={m.type === "INCOME" ? "text-emerald-600" : "text-red-600"}>
                      {m.type === "INCOME" ? "+" : "-"}
                      {formatCurrency(m.amount)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <form onSubmit={handleClose} className="card p-6 h-fit">
            <h3 className="font-serif text-lg text-stone-800 mb-4">Cerrar caja</h3>
            <label className="label mb-2">Efectivo contado (€) *</label>
            <input
              type="number"
              className="input mb-4"
              min="0"
              step="0.01"
              value={closingBalance}
              onChange={(e) => setClosingBalance(e.target.value)}
              required
            />
            <button type="submit" className="btn-primary w-full" disabled={closing}>
              {closing ? "Cerrando…" : "Cerrar caja"}
            </button>
          </form>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-stone-100">
          <h3 className="font-serif text-lg text-stone-800">Historial de turnos</h3>
        </div>
        {history.length === 0 ? (
          <div className="p-8 text-center text-stone-400 text-sm">Sin turnos cerrados todavía.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50">
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-stone-400 font-medium">Fecha</th>
                  <th className="px-4 py-3 text-right text-xs uppercase tracking-wider text-stone-400 font-medium">Fondo inicial</th>
                  <th className="px-4 py-3 text-right text-xs uppercase tracking-wider text-stone-400 font-medium">Esperado</th>
                  <th className="px-4 py-3 text-right text-xs uppercase tracking-wider text-stone-400 font-medium">Contado</th>
                  <th className="px-4 py-3 text-right text-xs uppercase tracking-wider text-stone-400 font-medium">Diferencia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {history.map((s) => (
                  <tr key={s.id} className="table-row-hover">
                    <td className="px-4 py-3 text-stone-600">{formatDate(s.date)}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(s.openingBalance)}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(s.expectedBalance ?? 0)}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(s.closingBalance ?? 0)}</td>
                    <td
                      className={`px-4 py-3 text-right font-medium ${
                        Number(s.difference) === 0
                          ? "text-stone-700"
                          : Number(s.difference) > 0
                          ? "text-emerald-600"
                          : "text-red-600"
                      }`}
                    >
                      {formatCurrency(s.difference ?? 0)}
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
