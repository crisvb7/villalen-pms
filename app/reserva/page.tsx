"use client";
// app/reserva/page.tsx
// Motor de Reservas Público — Paso a paso sin pasarela de pago

import { useState } from "react";
import { format, parseISO, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";

interface Room {
  id: string;
  name: string;
  description: string | null;
  capacity: number;
  basePrice: string;
  amenities: string[];
}

interface BookingConfirmation {
  id: string;
  totalAmount: string;
  room: { name: string };
  checkInDate: string;
  checkOutDate: string;
  guest: { firstName: string; lastName: string; email: string };
}

type Step = "search" | "results" | "form" | "success";

export default function ReservaPage() {
  const [step, setStep] = useState<Step>("search");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(2);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState<BookingConfirmation | null>(null);

  // Datos del formulario del huésped
  const [guestForm, setGuestForm] = useState({
    firstName: "",
    lastName: "",
    documentId: "",
    email: "",
    phone: "",
    notes: "",
  });

  const today = format(new Date(), "yyyy-MM-dd");

  const nights =
    checkIn && checkOut
      ? Math.max(0, differenceInDays(parseISO(checkOut), parseISO(checkIn)))
      : 0;

  // ── Paso 1: Buscar disponibilidad ────────────────────────────────────────
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkIn || !checkOut || nights < 1) {
      setError("Selecciona fechas válidas (mínimo 1 noche).");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const res = await fetch(
        `/api/rooms/availability?checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRooms(data.data);
      setStep("results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al buscar.");
    } finally {
      setLoading(false);
    }
  };

  // ── Paso 2: Seleccionar habitación ───────────────────────────────────────
  const handleSelectRoom = (room: Room) => {
    setSelectedRoom(room);
    setStep("form");
  };

  // ── Paso 3: Enviar reserva ───────────────────────────────────────────────
  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoom) return;
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: selectedRoom.id,
          checkInDate: checkIn,
          checkOutDate: checkOut,
          adults: guests,
          notes: guestForm.notes,
          source: "WEB",
          guest: {
            firstName: guestForm.firstName,
            lastName: guestForm.lastName,
            documentId: guestForm.documentId,
            email: guestForm.email,
            phone: guestForm.phone,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setConfirmation(data.data);
      setStep("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear la reserva.");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: string | number) =>
    new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(
      Number(amount)
    );

  const formatDateEs = (d: string) =>
    format(parseISO(d), "d 'de' MMMM 'de' yyyy", { locale: es });

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-4 flex items-center justify-between">
          <Link href="/" className="group">
            <h1 className="font-serif text-xl text-stone-900 group-hover:text-amber-800 transition-colors">
              Casa do Souto
            </h1>
            <p className="text-xs uppercase tracking-widest text-stone-400">
              Motor de Reservas
            </p>
          </Link>
          {/* Indicador de pasos */}
          <div className="hidden md:flex items-center gap-3 text-xs text-stone-400">
            {(["search", "results", "form", "success"] as Step[]).map(
              (s, i) => {
                const labels: Record<Step, string> = {
                  search: "1. Fechas",
                  results: "2. Habitación",
                  form: "3. Tus datos",
                  success: "4. Confirmación",
                };
                const isActive = step === s;
                const isPast =
                  ["search", "results", "form", "success"].indexOf(step) > i;
                return (
                  <span
                    key={s}
                    className={`${isActive ? "text-amber-800 font-semibold" : isPast ? "text-stone-600" : ""}`}
                  >
                    {labels[s]}
                    {i < 3 && <span className="ml-3">→</span>}
                  </span>
                );
              }
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-12">
        {/* ── PASO 1: BÚSQUEDA ── */}
        {step === "search" && (
          <div className="max-w-2xl mx-auto">
            <div className="mb-10 text-center">
              <p className="text-xs uppercase tracking-widest text-amber-700 mb-2">
                Disponibilidad en tiempo real
              </p>
              <h2 className="font-serif text-4xl text-stone-800">
                ¿Cuándo nos visitas?
              </h2>
            </div>

            <form onSubmit={handleSearch} className="card p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="label mb-2">Check-in</label>
                  <input
                    type="date"
                    className="input"
                    min={today}
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="label mb-2">Check-out</label>
                  <input
                    type="date"
                    className="input"
                    min={checkIn || today}
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="mb-8">
                <label className="label mb-2">Número de huéspedes</label>
                <select
                  className="input"
                  value={guests}
                  onChange={(e) => setGuests(Number(e.target.value))}
                >
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <option key={n} value={n}>
                      {n} {n === 1 ? "persona" : "personas"}
                    </option>
                  ))}
                </select>
              </div>

              {nights > 0 && (
                <div className="mb-6 bg-amber-50 border border-amber-200 p-4 text-center">
                  <p className="text-sm text-amber-800">
                    <strong>{nights} {nights === 1 ? "noche" : "noches"}</strong> ·{" "}
                    {formatDateEs(checkIn)} → {formatDateEs(checkOut)}
                  </p>
                </div>
              )}

              {error && (
                <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 p-3">
                  {error}
                </p>
              )}

              <button
                type="submit"
                className="btn-primary w-full"
                disabled={loading}
              >
                {loading ? "Buscando…" : "Ver habitaciones disponibles →"}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-xs text-stone-400">
                🔒 Reserva segura sin tarjeta. Pago por transferencia bancaria al confirmar.
              </p>
            </div>
          </div>
        )}

        {/* ── PASO 2: RESULTADOS ── */}
        {step === "results" && (
          <div>
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h2 className="font-serif text-3xl text-stone-800">
                  Habitaciones disponibles
                </h2>
                <p className="text-sm text-stone-500 mt-1">
                  {nights} {nights === 1 ? "noche" : "noches"} ·{" "}
                  {checkIn && formatDateEs(checkIn)} →{" "}
                  {checkOut && formatDateEs(checkOut)} ·{" "}
                  {guests} {guests === 1 ? "persona" : "personas"}
                </p>
              </div>
              <button
                onClick={() => setStep("search")}
                className="btn-ghost text-sm"
              >
                ← Cambiar fechas
              </button>
            </div>

            {rooms.length === 0 ? (
              <div className="card p-12 text-center">
                <p className="text-4xl mb-4">😔</p>
                <h3 className="font-serif text-2xl text-stone-700 mb-2">
                  No hay disponibilidad
                </h3>
                <p className="text-stone-500 mb-6">
                  No encontramos habitaciones libres para esas fechas o número
                  de huéspedes. Prueba con otras fechas.
                </p>
                <button onClick={() => setStep("search")} className="btn-secondary">
                  Cambiar fechas
                </button>
              </div>
            ) : (
              <div className="grid gap-4">
                {rooms.map((room) => {
                  const total = Number(room.basePrice) * nights;
                  return (
                    <div key={room.id} className="card p-6 flex flex-col md:flex-row gap-6">
                      <div className="h-36 w-full md:w-48 flex-shrink-0 bg-stone-100 flex items-center justify-center text-4xl">
                        🏡
                      </div>
                      <div className="flex-1">
                        <h3 className="font-serif text-2xl text-stone-800 mb-1">
                          {room.name}
                        </h3>
                        <p className="text-xs text-stone-400 mb-3">
                          Hasta {room.capacity} personas
                        </p>
                        <p className="text-sm text-stone-500 mb-4 leading-relaxed">
                          {room.description}
                        </p>
                        {room.amenities.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-4">
                            {room.amenities.slice(0, 5).map((a) => (
                              <span
                                key={a}
                                className="bg-stone-100 text-stone-600 text-xs px-2 py-1"
                              >
                                {a}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end justify-between min-w-[160px]">
                        <div className="text-right">
                          <p className="text-xs text-stone-400">
                            {formatCurrency(room.basePrice)} / noche
                          </p>
                          <p className="font-serif text-3xl text-stone-900">
                            {formatCurrency(total)}
                          </p>
                          <p className="text-xs text-stone-400">
                            {nights} {nights === 1 ? "noche" : "noches"} · IVA incl.
                          </p>
                        </div>
                        <button
                          onClick={() => handleSelectRoom(room)}
                          className="btn-primary mt-4 w-full"
                        >
                          Seleccionar →
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── PASO 3: FORMULARIO DE DATOS ── */}
        {step === "form" && selectedRoom && (
          <div className="max-w-2xl mx-auto">
            <div className="mb-8">
              <button onClick={() => setStep("results")} className="btn-ghost mb-4 -ml-2">
                ← Volver a habitaciones
              </button>
              <h2 className="font-serif text-3xl text-stone-800">Tus datos</h2>
            </div>

            {/* Resumen de la reserva */}
            <div className="card p-5 mb-6 bg-amber-50 border-amber-200">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-stone-800">{selectedRoom.name}</p>
                  <p className="text-sm text-stone-500 mt-0.5">
                    {checkIn && formatDateEs(checkIn)} →{" "}
                    {checkOut && formatDateEs(checkOut)}
                  </p>
                  <p className="text-sm text-stone-500">
                    {nights} {nights === 1 ? "noche" : "noches"} ·{" "}
                    {guests} {guests === 1 ? "persona" : "personas"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-serif text-2xl text-stone-900">
                    {new Intl.NumberFormat("es-ES", {
                      style: "currency",
                      currency: "EUR",
                    }).format(Number(selectedRoom.basePrice) * nights)}
                  </p>
                  <p className="text-xs text-stone-400">Total estimado</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleBooking} className="card p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="label mb-2">Nombre *</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="María"
                    value={guestForm.firstName}
                    onChange={(e) =>
                      setGuestForm({ ...guestForm, firstName: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <label className="label mb-2">Apellidos *</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="García López"
                    value={guestForm.lastName}
                    onChange={(e) =>
                      setGuestForm({ ...guestForm, lastName: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="label mb-2">DNI / NIE / Pasaporte *</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="12345678A"
                    value={guestForm.documentId}
                    onChange={(e) =>
                      setGuestForm({
                        ...guestForm,
                        documentId: e.target.value.toUpperCase(),
                      })
                    }
                    required
                  />
                </div>
                <div>
                  <label className="label mb-2">Teléfono</label>
                  <input
                    type="tel"
                    className="input"
                    placeholder="+34 600 000 000"
                    value={guestForm.phone}
                    onChange={(e) =>
                      setGuestForm({ ...guestForm, phone: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="mb-6">
                <label className="label mb-2">Email *</label>
                <input
                  type="email"
                  className="input"
                  placeholder="tu@email.com"
                  value={guestForm.email}
                  onChange={(e) =>
                    setGuestForm({ ...guestForm, email: e.target.value })
                  }
                  required
                />
                <p className="text-xs text-stone-400 mt-1">
                  Recibirás las instrucciones de pago en este correo.
                </p>
              </div>

              <div className="mb-8">
                <label className="label mb-2">Comentarios (opcional)</label>
                <textarea
                  className="input resize-none"
                  rows={3}
                  placeholder="Llegada tardía, alergias, ocasión especial…"
                  value={guestForm.notes}
                  onChange={(e) =>
                    setGuestForm({ ...guestForm, notes: e.target.value })
                  }
                />
              </div>

              {error && (
                <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 p-3">
                  {error}
                </p>
              )}

              <div className="bg-stone-50 border border-stone-200 p-4 mb-6 text-sm text-stone-500">
                <p className="font-medium text-stone-700 mb-1">
                  💳 Sin pago ahora
                </p>
                <p>
                  Esta reserva quedará como <strong>PENDIENTE</strong>. En
                  breve recibirás un email con los datos para realizar el pago
                  por <strong>transferencia bancaria</strong>. La reserva se
                  confirmará al recibir el ingreso.
                </p>
              </div>

              <button
                type="submit"
                className="btn-primary w-full"
                disabled={loading}
              >
                {loading ? "Procesando…" : "Confirmar solicitud de reserva →"}
              </button>
            </form>
          </div>
        )}

        {/* ── PASO 4: ÉXITO ── */}
        {step === "success" && confirmation && (
          <div className="max-w-xl mx-auto text-center">
            <div className="card p-10">
              <div className="text-5xl mb-6">🎉</div>
              <p className="text-xs uppercase tracking-widest text-amber-700 mb-2">
                Solicitud recibida
              </p>
              <h2 className="font-serif text-3xl text-stone-800 mb-4">
                ¡Gracias, {confirmation.guest.firstName}!
              </h2>
              <p className="text-stone-500 mb-6 leading-relaxed">
                Hemos registrado tu solicitud de reserva correctamente. En breve
                recibirás un email en{" "}
                <strong>{confirmation.guest.email}</strong> con las instrucciones
                para realizar el pago por{" "}
                <strong>transferencia bancaria</strong>. La reserva quedará
                confirmada en cuanto recibamos el ingreso.
              </p>

              <div className="border border-stone-200 divide-y divide-stone-100 text-left mb-8">
                <div className="flex justify-between px-4 py-3">
                  <span className="text-xs uppercase tracking-wider text-stone-400">
                    Nº Reserva
                  </span>
                  <span className="font-mono text-sm text-stone-700">
                    {confirmation.id.slice(-8).toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between px-4 py-3">
                  <span className="text-xs uppercase tracking-wider text-stone-400">
                    Alojamiento
                  </span>
                  <span className="text-sm text-stone-700">
                    {confirmation.room.name}
                  </span>
                </div>
                <div className="flex justify-between px-4 py-3">
                  <span className="text-xs uppercase tracking-wider text-stone-400">
                    Check-in
                  </span>
                  <span className="text-sm text-stone-700">
                    {formatDateEs(confirmation.checkInDate)}
                  </span>
                </div>
                <div className="flex justify-between px-4 py-3">
                  <span className="text-xs uppercase tracking-wider text-stone-400">
                    Check-out
                  </span>
                  <span className="text-sm text-stone-700">
                    {formatDateEs(confirmation.checkOutDate)}
                  </span>
                </div>
                <div className="flex justify-between px-4 py-3">
                  <span className="text-xs uppercase tracking-wider text-stone-400">
                    Importe Total
                  </span>
                  <span className="font-serif text-lg text-stone-800">
                    {new Intl.NumberFormat("es-ES", {
                      style: "currency",
                      currency: "EUR",
                    }).format(Number(confirmation.totalAmount))}
                  </span>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900 mb-8">
                <p className="font-semibold mb-1">📧 Próximos pasos:</p>
                <ol className="text-left space-y-1 list-decimal list-inside text-amber-800">
                  <li>Revisa tu bandeja de entrada (y spam).</li>
                  <li>Realiza la transferencia con el importe indicado.</li>
                  <li>Te enviaremos la confirmación definitiva en 24h.</li>
                </ol>
              </div>

              <Link href="/" className="btn-secondary w-full justify-center">
                ← Volver al inicio
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
