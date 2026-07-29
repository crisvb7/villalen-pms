// app/admin/habitaciones/page.tsx
"use client";

import { useEffect, useState } from "react";
import { formatCurrency, cn } from "@/lib/utils";

interface Room {
  id: string;
  name: string;
  description: string | null;
  capacity: number;
  basePrice: string;
  isClean: boolean;
  amenities: string[];
  channexRoomTypeId: string | null;
  channexRatePlanId: string | null;
}

export default function HabitacionesPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    capacity: "2",
    basePrice: "",
    amenities: "",
  });
  const [channelRoomId, setChannelRoomId] = useState<string | null>(null);
  const [channelForm, setChannelForm] = useState({ channexRoomTypeId: "", channexRatePlanId: "" });
  const [channelSaving, setChannelSaving] = useState(false);
  const [channelMessage, setChannelMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    const res = await fetch("/api/rooms");
    const data = await res.json();
    setRooms(data.data ?? []);
    setLoading(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          capacity: Number(form.capacity),
          basePrice: Number(form.basePrice),
          amenities: form.amenities
            .split(",")
            .map((a) => a.trim())
            .filter(Boolean),
        }),
      });
      setForm({ name: "", description: "", capacity: "2", basePrice: "", amenities: "" });
      setShowForm(false);
      await fetchRooms();
    } finally {
      setSaving(false);
    }
  };

  const openChannelPanel = (room: Room) => {
    if (channelRoomId === room.id) {
      setChannelRoomId(null);
      return;
    }
    setChannelRoomId(room.id);
    setChannelMessage(null);
    setChannelForm({
      channexRoomTypeId: room.channexRoomTypeId ?? "",
      channexRatePlanId: room.channexRatePlanId ?? "",
    });
  };

  const handleSaveChannel = async (id: string) => {
    setChannelSaving(true);
    setChannelMessage(null);
    try {
      const res = await fetch(`/api/rooms/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(channelForm),
      });
      const data = await res.json();
      setChannelMessage(res.ok ? "Mapeo guardado." : data.error ?? "Error al guardar.");
      if (res.ok) await fetchRooms();
    } finally {
      setChannelSaving(false);
    }
  };

  const handleSyncNow = async (id: string) => {
    setChannelSaving(true);
    setChannelMessage(null);
    try {
      const res = await fetch(`/api/rooms/${id}/channex-sync`, { method: "POST" });
      const data = await res.json();
      setChannelMessage(res.ok ? data.message : data.error ?? "Error al sincronizar.");
    } finally {
      setChannelSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar la habitación "${name}"?`)) return;
    const res = await fetch(`/api/rooms/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error);
      return;
    }
    await fetchRooms();
  };

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="font-serif text-3xl text-stone-800">Habitaciones</h1>
          <p className="text-sm text-stone-500 mt-1">
            {rooms.length} habitación(es) configurada(s)
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary text-sm"
        >
          {showForm ? "Cancelar" : "+ Añadir habitación"}
        </button>
      </div>

      {/* Formulario nueva habitación */}
      {showForm && (
        <form onSubmit={handleCreate} className="card p-6 mb-6">
          <h3 className="font-serif text-xl text-stone-800 mb-4">
            Nueva habitación
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="label mb-2">Nombre *</label>
              <input
                type="text"
                className="input"
                placeholder="Suite Carballo"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label mb-2">Precio / noche (€) *</label>
              <input
                type="number"
                className="input"
                placeholder="120"
                min="1"
                step="0.01"
                value={form.basePrice}
                onChange={(e) => setForm({ ...form, basePrice: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="label mb-2">Capacidad (personas) *</label>
              <input
                type="number"
                className="input"
                min="1"
                max="20"
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label mb-2">Amenidades (separadas por coma)</label>
              <input
                type="text"
                className="input"
                placeholder="WiFi, TV, Terraza, Aire acondicionado"
                value={form.amenities}
                onChange={(e) => setForm({ ...form, amenities: e.target.value })}
              />
            </div>
          </div>
          <div className="mb-6">
            <label className="label mb-2">Descripción</label>
            <textarea
              className="input resize-none"
              rows={3}
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </div>
          <div className="flex gap-3">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Guardando…" : "Crear habitación"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="btn-secondary"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Lista de habitaciones */}
      {loading ? (
        <div className="text-center py-12 text-stone-400">Cargando…</div>
      ) : (
        <div className="grid gap-4">
          {rooms.map((room) => (
            <div key={room.id} className="card p-6 flex flex-col md:flex-row gap-4">
              <div className="h-24 w-24 flex-shrink-0 bg-stone-100 flex items-center justify-center text-3xl">
                🏠
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-serif text-xl text-stone-800">
                      {room.name}
                    </h3>
                    <p className="text-xs text-stone-400">
                      Hasta {room.capacity} personas ·{" "}
                      {formatCurrency(room.basePrice)}/noche
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "text-xs border px-2 py-0.5",
                        room.isClean
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-red-50 text-red-700 border-red-200"
                      )}
                    >
                      {room.isClean ? "✓ Limpia" : "Sucia"}
                    </span>
                    <button
                      onClick={() => openChannelPanel(room)}
                      className={cn(
                        "text-xs px-2 py-0.5 border transition-colors",
                        room.channexRoomTypeId
                          ? "bg-sky-50 text-sky-700 border-sky-200"
                          : "bg-stone-50 text-stone-500 border-stone-200"
                      )}
                    >
                      {room.channexRoomTypeId ? "✓ Canales" : "Canales"}
                    </button>
                    <button
                      onClick={() => handleDelete(room.id, room.name)}
                      className="text-xs text-red-500 hover:text-red-700 transition-colors"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>

                {channelRoomId === room.id && (
                  <div className="mt-3 border border-stone-200 p-4 bg-stone-50">
                    <p className="text-xs text-stone-500 mb-3">
                      Mapeo con el Channel Manager (Channex). Crea antes el room type y el
                      rate plan de esta habitación en el dashboard de Channex y pega aquí sus IDs.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="label mb-1">Channex Room Type ID</label>
                        <input
                          type="text"
                          className="input"
                          value={channelForm.channexRoomTypeId}
                          onChange={(e) =>
                            setChannelForm({ ...channelForm, channexRoomTypeId: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <label className="label mb-1">Channex Rate Plan ID</label>
                        <input
                          type="text"
                          className="input"
                          value={channelForm.channexRatePlanId}
                          onChange={(e) =>
                            setChannelForm({ ...channelForm, channexRatePlanId: e.target.value })
                          }
                        />
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        className="btn-primary text-sm"
                        disabled={channelSaving}
                        onClick={() => handleSaveChannel(room.id)}
                      >
                        {channelSaving ? "Guardando…" : "Guardar mapeo"}
                      </button>
                      <button
                        className="btn-secondary text-sm"
                        disabled={channelSaving || !room.channexRoomTypeId}
                        onClick={() => handleSyncNow(room.id)}
                      >
                        Sincronizar ahora
                      </button>
                      {channelMessage && (
                        <span className="text-xs text-stone-600">{channelMessage}</span>
                      )}
                    </div>
                  </div>
                )}
                {room.description && (
                  <p className="text-sm text-stone-500 mb-3 leading-relaxed">
                    {room.description}
                  </p>
                )}
                {room.amenities.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {room.amenities.map((a) => (
                      <span
                        key={a}
                        className="text-xs bg-stone-100 text-stone-600 px-2 py-0.5"
                      >
                        {a}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
