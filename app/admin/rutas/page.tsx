// app/admin/rutas/page.tsx
"use client";

import { useEffect, useState } from "react";
import { cn, ROUTE_DIFFICULTY_COLORS, ROUTE_DIFFICULTY_LABELS } from "@/lib/utils";
import { ALLOWED_ROUTE_ICONS } from "@/lib/route-icons";

interface RouteItem {
  id: string;
  name: string;
  category: string;
  isCaminoStage: boolean;
  distanceKm: string;
  durationMin: number;
  elevationGainM: number;
  elevationLossM: number;
  difficulty: string;
  icon: string;
  description: string;
  pointsOfInterest: string[];
  isPublished: boolean;
  order: number;
}

const emptyForm = {
  name: "",
  category: "",
  isCaminoStage: false,
  distanceKm: "",
  durationMin: "",
  elevationGainM: "0",
  elevationLossM: "0",
  difficulty: "MODERATE",
  icon: ALLOWED_ROUTE_ICONS[0] as string,
  description: "",
  pointsOfInterest: "",
  isPublished: true,
  order: "0",
};

export default function RutasPage() {
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    fetchRoutes();
  }, []);

  const fetchRoutes = async () => {
    const res = await fetch("/api/routes");
    const data = await res.json();
    setRoutes(data.data ?? []);
    setLoading(false);
  };

  const openCreateForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
    setShowForm(true);
  };

  const openEditForm = (route: RouteItem) => {
    setEditingId(route.id);
    setForm({
      name: route.name,
      category: route.category,
      isCaminoStage: route.isCaminoStage,
      distanceKm: route.distanceKm,
      durationMin: String(route.durationMin),
      elevationGainM: String(route.elevationGainM),
      elevationLossM: String(route.elevationLossM),
      difficulty: route.difficulty,
      icon: route.icon,
      description: route.description,
      pointsOfInterest: route.pointsOfInterest.join(", "),
      isPublished: route.isPublished,
      order: String(route.order),
    });
    setError(null);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: form.name,
        category: form.category,
        isCaminoStage: form.isCaminoStage,
        distanceKm: Number(form.distanceKm),
        durationMin: Number(form.durationMin),
        elevationGainM: Number(form.elevationGainM),
        elevationLossM: Number(form.elevationLossM),
        difficulty: form.difficulty,
        icon: form.icon,
        description: form.description,
        pointsOfInterest: form.pointsOfInterest
          .split(",")
          .map((p) => p.trim())
          .filter(Boolean),
        isPublished: form.isPublished,
        order: Number(form.order),
      };

      const res = await fetch(
        editingId ? `/api/routes/${editingId}` : "/api/routes",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Error al guardar la ruta.");
        return;
      }
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
      await fetchRoutes();
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublished = async (route: RouteItem) => {
    await fetch(`/api/routes/${route.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublished: !route.isPublished }),
    });
    await fetchRoutes();
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar la ruta "${name}"? Esta acción no se puede deshacer.`))
      return;
    const res = await fetch(`/api/routes/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error);
      return;
    }
    await fetchRoutes();
  };

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="font-serif text-3xl text-stone-800">Rutas</h1>
          <p className="text-sm text-stone-500 mt-1">
            {routes.length} ruta(s) · guía de senderismo de la app de huéspedes
          </p>
        </div>
        <button onClick={showForm ? () => setShowForm(false) : openCreateForm} className="btn-primary text-sm">
          {showForm ? "Cancelar" : "+ Añadir ruta"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card p-6 mb-6">
          <h3 className="font-serif text-xl text-stone-800 mb-4">
            {editingId ? "Editar ruta" : "Nueva ruta"}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="label mb-2">Nombre *</label>
              <input
                type="text"
                className="input"
                placeholder="Etapa 12: Cuerres → Sebrayo"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label mb-2">Categoría *</label>
              <input
                type="text"
                className="input"
                placeholder="Camino Primitivo, Costa, Cultural, Montaña…"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="label mb-2">Distancia (km) *</label>
              <input
                type="number"
                className="input"
                min="0.1"
                step="0.1"
                value={form.distanceKm}
                onChange={(e) => setForm({ ...form, distanceKm: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label mb-2">Duración (min) *</label>
              <input
                type="number"
                className="input"
                min="1"
                value={form.durationMin}
                onChange={(e) => setForm({ ...form, durationMin: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label mb-2">Desnivel + (m)</label>
              <input
                type="number"
                className="input"
                min="0"
                value={form.elevationGainM}
                onChange={(e) => setForm({ ...form, elevationGainM: e.target.value })}
              />
            </div>
            <div>
              <label className="label mb-2">Desnivel - (m)</label>
              <input
                type="number"
                className="input"
                min="0"
                value={form.elevationLossM}
                onChange={(e) => setForm({ ...form, elevationLossM: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="label mb-2">Dificultad</label>
              <select
                className="input"
                value={form.difficulty}
                onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
              >
                <option value="EASY">Fácil</option>
                <option value="MODERATE">Moderada</option>
                <option value="HARD">Difícil</option>
              </select>
            </div>
            <div>
              <label className="label mb-2">Icono</label>
              <select
                className="input"
                value={form.icon}
                onChange={(e) => setForm({ ...form, icon: e.target.value })}
              >
                {ALLOWED_ROUTE_ICONS.map((icon) => (
                  <option key={icon} value={icon}>
                    {icon}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label mb-2">Orden</label>
              <input
                type="number"
                className="input"
                value={form.order}
                onChange={(e) => setForm({ ...form, order: e.target.value })}
              />
            </div>
            <div className="flex flex-col justify-end gap-2 pb-1">
              <label className="flex items-center gap-2 text-sm text-stone-600">
                <input
                  type="checkbox"
                  checked={form.isCaminoStage}
                  onChange={(e) => setForm({ ...form, isCaminoStage: e.target.checked })}
                />
                🐚 Etapa del Camino (destacada)
              </label>
              <label className="flex items-center gap-2 text-sm text-stone-600">
                <input
                  type="checkbox"
                  checked={form.isPublished}
                  onChange={(e) => setForm({ ...form, isPublished: e.target.checked })}
                />
                Publicada (visible para huéspedes)
              </label>
            </div>
          </div>

          <div className="mb-4">
            <label className="label mb-2">Descripción *</label>
            <textarea
              className="input resize-none"
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              required
            />
          </div>

          <div className="mb-6">
            <label className="label mb-2">Puntos de interés (separados por coma)</label>
            <input
              type="text"
              className="input"
              placeholder="Salida desde Cuerres, Alto de la Campa, Fuente del Peregrino…"
              value={form.pointsOfInterest}
              onChange={(e) => setForm({ ...form, pointsOfInterest: e.target.value })}
            />
          </div>

          {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

          <div className="flex gap-3">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Guardando…" : editingId ? "Guardar cambios" : "Crear ruta"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
              }}
              className="btn-secondary"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-center py-12 text-stone-400">Cargando…</div>
      ) : routes.length === 0 ? (
        <div className="card p-12 text-center text-stone-400">
          No hay rutas todavía. Añade la primera para que aparezca en la app de huéspedes.
        </div>
      ) : (
        <div className="grid gap-4">
          {routes.map((route) => (
            <div key={route.id} className="card p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    {route.isCaminoStage && <span className="text-lg">🐚</span>}
                    <h3 className="font-serif text-xl text-stone-800">{route.name}</h3>
                    <span
                      className={cn(
                        "badge",
                        ROUTE_DIFFICULTY_COLORS[route.difficulty]
                      )}
                    >
                      {ROUTE_DIFFICULTY_LABELS[route.difficulty]}
                    </span>
                    <span
                      className={cn(
                        "badge",
                        route.isPublished
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-stone-100 text-stone-500 border-stone-200"
                      )}
                    >
                      {route.isPublished ? "✓ Publicada" : "Oculta"}
                    </span>
                  </div>
                  <p className="text-xs text-stone-400 mb-2">
                    {route.category} · {route.distanceKm} km · {route.durationMin} min ·{" "}
                    +{route.elevationGainM}m / -{route.elevationLossM}m
                  </p>
                  <p className="text-sm text-stone-500 leading-relaxed">{route.description}</p>
                  {route.pointsOfInterest.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {route.pointsOfInterest.map((p) => (
                        <span
                          key={p}
                          className="text-xs bg-stone-100 text-stone-600 rounded-full px-2.5 py-1"
                        >
                          {p}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <button onClick={() => openEditForm(route)} className="chip bg-white text-stone-600 border-stone-200 hover:bg-stone-50">
                    Editar
                  </button>
                  <button
                    onClick={() => handleTogglePublished(route)}
                    className="chip bg-white text-stone-600 border-stone-200 hover:bg-stone-50"
                  >
                    {route.isPublished ? "Ocultar" : "Publicar"}
                  </button>
                  <button
                    onClick={() => handleDelete(route.id, route.name)}
                    className="chip bg-white text-red-600 border-red-200 hover:bg-red-50"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
