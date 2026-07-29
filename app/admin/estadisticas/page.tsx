"use client";
// app/admin/estadisticas/page.tsx

import { useEffect, useState } from "react";
import { format } from "date-fns";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { formatCurrency, SOURCE_LABELS } from "@/lib/utils";

const MONTH_LABELS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const PIE_COLORS = ["#b45309", "#0e7490", "#65a30d", "#a21caf", "#dc2626", "#334155"];

interface Stats {
  year: number;
  revenueByMonth: { month: number; value: number }[];
  expensesByMonth: { month: number; value: number }[];
  occupancyByMonth: { month: number; value: number }[];
  bookingsBySource: { source: string; count: number }[];
  roomPerformance: { roomName: string; bookings: number; revenue: number }[];
  totals: { revenue: number; expenses: number; net: number; averageOccupancy: number };
  availableYears: number[];
}

export default function EstadisticasPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [ineMonth, setIneMonth] = useState(format(new Date(), "yyyy-MM"));

  useEffect(() => {
    fetchStats(year);
  }, [year]);

  const fetchStats = async (y: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/stats?year=${y}`);
      const data = await res.json();
      setStats(data.data ?? null);
    } finally {
      setLoading(false);
    }
  };

  const financeData =
    stats?.revenueByMonth.map((m, i) => ({
      month: MONTH_LABELS[i],
      Ingresos: m.value,
      Gastos: stats.expensesByMonth[i]?.value ?? 0,
    })) ?? [];

  const occupancyData =
    stats?.occupancyByMonth.map((m, i) => ({ month: MONTH_LABELS[i], Ocupación: m.value })) ?? [];

  const sourceData =
    stats?.bookingsBySource.map((s) => ({
      name: SOURCE_LABELS[s.source] ?? s.source,
      value: s.count,
    })) ?? [];

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="font-serif text-3xl text-stone-800">Estadísticas</h1>
          <p className="text-sm text-stone-500 mt-1">Evolución del negocio por año</p>
        </div>
        <select
          className="input max-w-[120px]"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
        >
          {(stats?.availableYears ?? [year]).map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      {loading || !stats ? (
        <div className="p-12 text-center text-stone-400">Cargando estadísticas…</div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="card p-5">
              <p className="label mb-2">Ingresos</p>
              <p className="font-serif text-2xl text-emerald-700">{formatCurrency(stats.totals.revenue)}</p>
            </div>
            <div className="card p-5">
              <p className="label mb-2">Gastos</p>
              <p className="font-serif text-2xl text-red-600">{formatCurrency(stats.totals.expenses)}</p>
            </div>
            <div className="card p-5">
              <p className="label mb-2">Resultado neto</p>
              <p className={`font-serif text-2xl ${stats.totals.net >= 0 ? "text-stone-800" : "text-red-600"}`}>
                {formatCurrency(stats.totals.net)}
              </p>
            </div>
            <div className="card p-5">
              <p className="label mb-2">Ocupación media</p>
              <p className="font-serif text-2xl text-stone-800">{stats.totals.averageOccupancy}%</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="card p-6">
              <h3 className="font-serif text-lg text-stone-800 mb-4">Ingresos vs. gastos</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={financeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                  <Legend />
                  <Bar dataKey="Ingresos" fill="#0e7490" />
                  <Bar dataKey="Gastos" fill="#dc2626" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card p-6">
              <h3 className="font-serif text-lg text-stone-800 mb-4">Ocupación (%)</h3>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={occupancyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
                  <Tooltip formatter={(v) => `${v}%`} />
                  <Line type="monotone" dataKey="Ocupación" stroke="#b45309" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="card p-6">
              <h3 className="font-serif text-lg text-stone-800 mb-4">Reservas por canal</h3>
              {sourceData.length === 0 ? (
                <p className="text-sm text-stone-400 py-12 text-center">Sin reservas este año.</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={sourceData} dataKey="value" nameKey="name" outerRadius={90} label>
                      {sourceData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="card overflow-hidden">
              <div className="px-6 py-4 border-b border-stone-100">
                <h3 className="font-serif text-lg text-stone-800">Rendimiento por habitación</h3>
              </div>
              {stats.roomPerformance.length === 0 ? (
                <p className="text-sm text-stone-400 p-8 text-center">Sin datos este año.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-stone-100 bg-stone-50">
                      <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-stone-400 font-medium">Habitación</th>
                      <th className="px-4 py-3 text-right text-xs uppercase tracking-wider text-stone-400 font-medium">Reservas</th>
                      <th className="px-4 py-3 text-right text-xs uppercase tracking-wider text-stone-400 font-medium">Ingresos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-50">
                    {stats.roomPerformance.map((r) => (
                      <tr key={r.roomName}>
                        <td className="px-4 py-3 text-stone-700">{r.roomName}</td>
                        <td className="px-4 py-3 text-right text-stone-600">{r.bookings}</td>
                        <td className="px-4 py-3 text-right font-medium text-stone-800">
                          {formatCurrency(r.revenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="card p-6">
            <h3 className="font-serif text-lg text-stone-800 mb-2">Informe para el INE</h3>
            <p className="text-sm text-stone-500 mb-4">
              El INE selecciona por muestreo qué alojamientos deben reportar la Encuesta de
              Ocupación Hotelera — no es un envío automático. Descarga este informe (viajeros,
              pernoctaciones, estancia media, ocupación, nacionalidades) para rellenar el
              cuestionario a mano si tu establecimiento es seleccionado.
            </p>
            <div className="flex items-center gap-3">
              <input
                type="month"
                className="input max-w-[180px]"
                value={ineMonth}
                onChange={(e) => setIneMonth(e.target.value)}
              />
              <a
                href={`/api/stats/ine-report?year=${ineMonth.split("-")[0]}&month=${Number(ineMonth.split("-")[1])}`}
                className="btn-secondary text-sm"
              >
                Descargar informe INE (CSV)
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
