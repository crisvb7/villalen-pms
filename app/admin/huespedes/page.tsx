// app/admin/huespedes/page.tsx
"use client";

import { useEffect, useState } from "react";
import { formatDate } from "@/lib/utils";
import { prisma } from "@/lib/prisma";

interface Guest {
  id: string;
  firstName: string;
  lastName: string;
  documentId: string;
  email: string;
  phone: string | null;
  nationality: string | null;
  createdAt: string;
  _count?: { bookings: number };
}

export default function HuespedesPage() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/guests")
      .then((r) => r.json())
      .then((d) => {
        setGuests(d.data ?? []);
        setLoading(false);
      });
  }, []);

  const filtered = guests.filter((g) => {
    const q = search.toLowerCase();
    return (
      g.firstName.toLowerCase().includes(q) ||
      g.lastName.toLowerCase().includes(q) ||
      g.email.toLowerCase().includes(q) ||
      g.documentId.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="font-serif text-3xl text-stone-800">Huéspedes</h1>
          <p className="text-sm text-stone-500 mt-1">
            {guests.length} registro(s) en la base de datos
          </p>
        </div>
      </div>

      <div className="mb-4">
        <input
          type="search"
          className="input max-w-md"
          placeholder="Buscar por nombre, email o documento…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-stone-400">
            Cargando huéspedes…
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-stone-400">
            {search ? "Sin resultados para tu búsqueda." : "No hay huéspedes registrados."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50">
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-stone-400 font-medium">
                    Nombre
                  </th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-stone-400 font-medium">
                    Documento
                  </th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-stone-400 font-medium">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-stone-400 font-medium">
                    Teléfono
                  </th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-stone-400 font-medium">
                    Nac.
                  </th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-stone-400 font-medium">
                    Alta
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {filtered.map((guest) => (
                  <tr key={guest.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-stone-800">
                        {guest.firstName} {guest.lastName}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs bg-stone-100 px-2 py-0.5 text-stone-600">
                        {guest.documentId}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-stone-600">
                      <a
                        href={`mailto:${guest.email}`}
                        className="hover:text-amber-800 transition-colors"
                      >
                        {guest.email}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-stone-500">
                      {guest.phone ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-stone-100 px-2 py-0.5 text-stone-600">
                        {guest.nationality ?? "ES"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-stone-400 text-xs">
                      {formatDate(guest.createdAt)}
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
