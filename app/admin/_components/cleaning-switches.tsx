// app/admin/_components/cleaning-switches.tsx
// Estado de limpieza con interruptores (como "Lighting Control" en el diseño
// de referencia). Usa la misma API que /admin/limpieza.
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface CleaningRoom {
  id: string;
  name: string;
  isClean: boolean;
}

export default function CleaningSwitches({ rooms }: { rooms: CleaningRoom[] }) {
  const router = useRouter();
  const [state, setState] = useState(rooms);
  const [saving, setSaving] = useState<string | null>(null);

  async function toggle(id: string, current: boolean) {
    setSaving(id);
    // Cambio optimista: el interruptor se mueve al momento y se revierte si falla.
    setState((s) => s.map((r) => (r.id === id ? { ...r, isClean: !current } : r)));
    try {
      const res = await fetch("/api/rooms/cleaning", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isClean: !current }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setState((s) => s.map((r) => (r.id === id ? { ...r, isClean: current } : r)));
    } finally {
      setSaving(null);
    }
  }

  if (state.length === 0) {
    return <p className="text-sm text-white/50">No hay habitaciones registradas.</p>;
  }

  return (
    <ul className="space-y-1.5">
      {state.map((room) => (
        <li key={room.id} className="flex items-center justify-between gap-3">
          <span
            className={`min-w-0 truncate text-sm transition-colors ${
              room.isClean ? "text-white/85" : "text-white/55"
            }`}
            title={room.isClean ? "Limpia" : "Pendiente de limpieza"}
          >
            {room.name}
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={room.isClean}
            aria-label={`${room.name}: ${room.isClean ? "limpia" : "sucia"}`}
            disabled={saving === room.id}
            onClick={() => toggle(room.id, room.isClean)}
            className="glass-switch"
          />
        </li>
      ))}
    </ul>
  );
}
