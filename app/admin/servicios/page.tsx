// app/admin/servicios/page.tsx
// Tablón operativo del día: qué reservas activas piden desayuno, cena o
// limpieza — con la posibilidad de marcarlo/desmarcarlo a mano (huésped que
// llama por teléfono, o corregir un error), igual que puede hacer el
// huésped desde su app. También aquí se enciende/apaga la cena según
// temporada de peregrinos.
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const SERVICE_META = [
  { type: "BREAKFAST" as const, label: "Desayuno", icon: "🥐" },
  { type: "DINNER" as const, label: "Cena", icon: "🍴" },
  { type: "CLEANING" as const, label: "Limpieza", icon: "🧹" },
];

interface BoardRow {
  bookingId: string;
  roomName: string;
  guestName: string;
  requests: Record<"BREAKFAST" | "DINNER" | "CLEANING", boolean>;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function ServiciosHoyPage() {
  const [date, setDate] = useState(todayISO());
  const [rows, setRows] = useState<BoardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [dinnerEnabled, setDinnerEnabled] = useState<boolean | null>(null);
  const [savingDinnerSetting, setSavingDinnerSetting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/services/today?date=${date}`);
      const data = await res.json();
      setRows(data.data ?? []);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => setDinnerEnabled(data.data?.dinnerServiceEnabled ?? true))
      .catch(() => {});
  }, []);

  async function toggleDinnerService() {
    if (dinnerEnabled === null) return;
    const next = !dinnerEnabled;
    setSavingDinnerSetting(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dinnerServiceEnabled: next }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "No se pudo guardar el ajuste.");
        return;
      }
      setDinnerEnabled(next);
    } finally {
      setSavingDinnerSetting(false);
    }
  }

  async function toggle(bookingId: string, type: string, next: boolean) {
    const key = `${bookingId}-${type}`;
    setToggling(key);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/services`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, type, requested: next }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "No se pudo actualizar.");
        return;
      }
      setRows((prev) =>
        prev.map((r) =>
          r.bookingId === bookingId
            ? { ...r, requests: { ...r.requests, [type]: next } }
            : r
        )
      );
    } finally {
      setToggling(null);
    }
  }

  const totals = SERVICE_META.map((meta) => ({
    ...meta,
    count: rows.filter((r) => r.requests[meta.type]).length,
  }));

  return (
    <div>
      <div className="mb-4 flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-serif text-3xl text-stone-800">Servicios del día</h1>
          <p className="text-sm text-stone-500 mt-1">
            {totals.map((t) => `${t.icon} ${t.count}`).join("   ·   ")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="input"
          />
          <button onClick={load} className="btn-ghost text-sm">
            ↻ Actualizar
          </button>
        </div>
      </div>

      <div className="card mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="font-medium text-stone-800">🍴 Servicio de cena (temporada de peregrinos)</p>
          <p className="text-xs text-stone-500 mt-0.5">
            {dinnerEnabled === false
              ? "Apagado: los huéspedes no pueden pedir cena desde la app."
              : "Encendido: los huéspedes pueden pedir cena hasta las 17:00 del mismo día."}
          </p>
        </div>
        <button
          onClick={toggleDinnerService}
          disabled={dinnerEnabled === null || savingDinnerSetting}
          className={cn(
            "chip whitespace-nowrap",
            dinnerEnabled
              ? "bg-emerald-100 text-emerald-800 border-emerald-200"
              : "bg-stone-100 text-stone-500 border-stone-200",
            (dinnerEnabled === null || savingDinnerSetting) && "opacity-60"
          )}
        >
          {dinnerEnabled ? "Encendido · apagar" : "Apagado · encender"}
        </button>
      </div>

      {loading ? (
        <p className="text-stone-400">Cargando…</p>
      ) : rows.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-stone-400">No hay reservas activas ese día.</p>
        </div>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm" style={{ minWidth: 640 }}>
            <thead>
              <tr className="border-b border-stone-100">
                <th className="text-left px-4 py-3 text-stone-400 font-medium whitespace-nowrap">
                  Habitación
                </th>
                <th className="text-left px-4 py-3 text-stone-400 font-medium whitespace-nowrap">
                  Huésped
                </th>
                {SERVICE_META.map((meta) => (
                  <th
                    key={meta.type}
                    className="text-center px-3 py-3 text-stone-400 font-medium whitespace-nowrap"
                  >
                    {meta.icon} {meta.label}
                  </th>
                ))}
                <th className="px-4 py-3 whitespace-nowrap" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.bookingId} className="border-b border-stone-50 last:border-0">
                  <td className="px-4 py-3 font-medium text-stone-800 whitespace-nowrap">
                    {row.roomName}
                  </td>
                  <td className="px-4 py-3 text-stone-600 whitespace-nowrap">{row.guestName}</td>
                  {SERVICE_META.map((meta) => {
                    const active = row.requests[meta.type];
                    const key = `${row.bookingId}-${meta.type}`;
                    return (
                      <td key={meta.type} className="text-center px-3 py-3">
                        <button
                          disabled={toggling === key}
                          onClick={() => toggle(row.bookingId, meta.type, !active)}
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
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <Link
                      href={`/admin/reservas/${row.bookingId}`}
                      className="text-xs text-villalen-600 hover:underline"
                    >
                      Ver reserva →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
