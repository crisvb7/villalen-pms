// app/admin/reservas/[id]/page.tsx
// Detalle de una reserva: lo que el huésped pidió desde la app (desayuno,
// cena, limpieza por día) y el chat con recepción — visible y editable por
// el personal, mismo dato que ve/edita la app de huéspedes.
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { addDays, format } from "date-fns";
import {
  cn,
  formatDate,
  formatCurrency,
  STATUS_LABELS,
  STATUS_COLORS,
  getRoomDisplayName,
  detectDocumentType,
} from "@/lib/utils";

const SERVICE_META: { type: "BREAKFAST" | "DINNER" | "CLEANING"; label: string; icon: string }[] = [
  { type: "BREAKFAST", label: "Desayuno", icon: "🥐" },
  { type: "DINNER", label: "Cena", icon: "🍴" },
  { type: "CLEANING", label: "Limpieza", icon: "🧹" },
];

interface Guest {
  firstName: string;
  lastName: string;
  secondLastName: string | null;
  email: string;
  phone: string | null;
  documentId: string;
  documentSupportNumber: string | null;
  nationality: string | null;
  birthDate: string | null;
  sex: "H" | "M" | null;
  addressStreet: string | null;
  addressCity: string | null;
  addressMunicipalityCode: string | null;
  addressPostalCode: string | null;
  addressProvince: string | null;
  addressCountry: string | null;
}

interface Booking {
  id: string;
  status: string;
  checkInDate: string;
  checkOutDate: string;
  totalAmount: string;
  guest: Guest;
  room: { name: string } | null;
  roomType: string;
  guestChatClearedAt: string | null;
  precheckinCompletedAt: string | null;
  sesSubmittedAt: string | null;
  sesSubmissionError: string | null;
}

const SEX_LABELS: Record<string, string> = { H: "Hombre", M: "Mujer" };

const EMPTY_GUEST_FORM = {
  firstName: "",
  lastName: "",
  secondLastName: "",
  documentId: "",
  documentSupportNumber: "",
  nationality: "",
  birthDate: "",
  sex: "" as "" | "H" | "M",
  phone: "",
  addressStreet: "",
  addressCity: "",
  addressMunicipalityCode: "",
  addressPostalCode: "",
  addressProvince: "",
  addressCountry: "",
};

interface Traveler {
  id: string;
  firstName: string;
  lastName: string;
  secondLastName: string | null;
  documentId: string | null;
  documentSupportNumber: string | null;
  nationality: string | null;
  birthDate: string | null;
  sex: "H" | "M" | null;
  addressStreet: string | null;
  addressCity: string | null;
  addressPostalCode: string | null;
  addressProvince: string | null;
  addressCountry: string | null;
  phone: string | null;
  email: string | null;
  relationshipToLead: string | null;
}

const EMPTY_TRAVELER_FORM = {
  firstName: "",
  lastName: "",
  secondLastName: "",
  documentId: "",
  documentSupportNumber: "",
  birthDate: "",
  nationality: "",
  sex: "" as "" | "H" | "M",
  relationshipToLead: "",
  sameAddressAsLead: true,
  addressStreet: "",
  addressCity: "",
  addressMunicipalityCode: "",
  addressPostalCode: "",
  addressProvince: "",
  addressCountry: "",
  phone: "",
  email: "",
};

function isMinorDob(dob: string): boolean {
  if (!dob) return false;
  const age = (Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  return age < 18;
}

interface ServiceRequest {
  id: string;
  date: string;
  type: "BREAKFAST" | "DINNER" | "CLEANING";
  status: "REQUESTED" | "CANCELLED";
}

interface Message {
  id: string;
  sender: "GUEST" | "STAFF";
  body: string;
  createdAt: string;
}

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [services, setServices] = useState<ServiceRequest[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [messageBody, setMessageBody] = useState("");
  const [sending, setSending] = useState(false);
  const [clearingChat, setClearingChat] = useState(false);
  const [editingGuest, setEditingGuest] = useState(false);
  const [guestForm, setGuestForm] = useState(EMPTY_GUEST_FORM);
  const [savingGuest, setSavingGuest] = useState(false);
  const [guestError, setGuestError] = useState("");
  const [sendingSes, setSendingSes] = useState(false);
  const [travelers, setTravelers] = useState<Traveler[]>([]);
  const [addingTraveler, setAddingTraveler] = useState(false);
  const [travelerForm, setTravelerForm] = useState(EMPTY_TRAVELER_FORM);
  const [savingTraveler, setSavingTraveler] = useState(false);
  const [travelerError, setTravelerError] = useState("");

  const load = useCallback(async () => {
    const [bRes, sRes, mRes, tRes] = await Promise.all([
      fetch(`/api/bookings/${id}`),
      fetch(`/api/bookings/${id}/services`),
      fetch(`/api/bookings/${id}/messages`),
      fetch(`/api/bookings/${id}/travelers`),
    ]);
    const [bData, sData, mData, tData] = await Promise.all([bRes.json(), sRes.json(), mRes.json(), tRes.json()]);
    setBooking(bData.data ?? null);
    setServices(sData.data ?? []);
    setMessages(mData.data ?? []);
    setTravelers(tData.data ?? []);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleService(dateStr: string, type: string, next: boolean) {
    const key = `${dateStr}-${type}`;
    setToggling(key);
    try {
      const res = await fetch(`/api/bookings/${id}/services`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: dateStr, type, requested: next }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "No se pudo actualizar.");
        return;
      }
      setServices((prev) => {
        const idx = prev.findIndex(
          (r) => r.date.slice(0, 10) === dateStr && r.type === type
        );
        if (idx === -1) return [...prev, data.data];
        const copy = [...prev];
        copy[idx] = data.data;
        return copy;
      });
    } finally {
      setToggling(null);
    }
  }

  async function sendMessage() {
    const body = messageBody.trim();
    if (!body) return;
    setSending(true);
    try {
      const res = await fetch(`/api/bookings/${id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "No se pudo enviar el mensaje.");
        return;
      }
      setMessages((prev) => [...prev, data.data]);
      setMessageBody("");
    } finally {
      setSending(false);
    }
  }

  async function handleClearGuestChat() {
    if (
      !confirm(
        "El huésped dejará de ver el chat en su app (si vuelve a escribir, lo nuevo sí se verá). El historial completo sigue disponible aquí. ¿Continuar?"
      )
    )
      return;
    setClearingChat(true);
    try {
      const res = await fetch(`/api/bookings/${id}/clear-guest-chat`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "No se pudo ocultar el chat.");
        return;
      }
      setBooking((prev) => (prev ? { ...prev, guestChatClearedAt: data.data.guestChatClearedAt } : prev));
    } finally {
      setClearingChat(false);
    }
  }

  function openGuestEdit() {
    if (!booking) return;
    const g = booking.guest;
    setGuestForm({
      firstName: g.firstName,
      lastName: g.lastName,
      secondLastName: g.secondLastName ?? "",
      documentId: g.documentId,
      documentSupportNumber: g.documentSupportNumber ?? "",
      nationality: g.nationality ?? "",
      birthDate: g.birthDate ? g.birthDate.slice(0, 10) : "",
      sex: g.sex ?? "",
      phone: g.phone ?? "",
      addressStreet: g.addressStreet ?? "",
      addressCity: g.addressCity ?? "",
      addressMunicipalityCode: g.addressMunicipalityCode ?? "",
      addressPostalCode: g.addressPostalCode ?? "",
      addressProvince: g.addressProvince ?? "",
      addressCountry: g.addressCountry ?? "ES",
    });
    setGuestError("");
    setEditingGuest(true);
  }

  async function saveGuest() {
    if (!guestForm.firstName.trim() || !guestForm.lastName.trim() || !guestForm.documentId.trim()) {
      setGuestError("Nombre, primer apellido y documento son obligatorios.");
      return;
    }
    setSavingGuest(true);
    setGuestError("");
    try {
      const res = await fetch(`/api/bookings/${id}/precheckin`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(guestForm),
      });
      const data = await res.json();
      if (!res.ok) {
        setGuestError(data.error ?? "No se pudieron guardar los datos.");
        return;
      }
      await load();
      setEditingGuest(false);
    } finally {
      setSavingGuest(false);
    }
  }

  async function handleSendSes() {
    setSendingSes(true);
    try {
      const res = await fetch(`/api/bookings/${id}/ses-submit`, { method: "POST" });
      const data = await res.json();
      alert(res.ok ? data.message : data.error);
      await load();
    } finally {
      setSendingSes(false);
    }
  }

  async function handleCopyPrecheckinLink() {
    const link = `${window.location.origin}/precheckin/${id}`;
    await navigator.clipboard.writeText(link);
    alert("Enlace de precheckin copiado al portapapeles.");
  }

  async function handleAddTraveler(e: React.FormEvent) {
    e.preventDefault();
    setTravelerError("");
    if (!travelerForm.firstName.trim() || !travelerForm.lastName.trim()) {
      setTravelerError("Nombre y primer apellido son obligatorios.");
      return;
    }
    const minor = isMinorDob(travelerForm.birthDate);
    if (minor && !travelerForm.relationshipToLead.trim()) {
      setTravelerError("Indica el parentesco con el titular para un menor de edad.");
      return;
    }
    if (!minor && !travelerForm.documentId.trim()) {
      setTravelerError("El documento es obligatorio para un acompañante mayor de edad.");
      return;
    }
    if (!travelerForm.sameAddressAsLead) {
      const country = travelerForm.addressCountry.toUpperCase();
      const isSpain = country === "ES" || country === "ESP";
      if (
        !travelerForm.addressStreet.trim() ||
        !travelerForm.addressCity.trim() ||
        !travelerForm.addressPostalCode.trim() ||
        !travelerForm.addressCountry.trim() ||
        (isSpain && !travelerForm.addressMunicipalityCode.trim())
      ) {
        setTravelerError("Completa la dirección del acompañante (o marca que es la misma que la del titular).");
        return;
      }
    }
    setSavingTraveler(true);
    try {
      const { sameAddressAsLead, ...rest } = travelerForm;
      const payload = sameAddressAsLead
        ? {
            ...rest,
            addressStreet: undefined,
            addressCity: undefined,
            addressMunicipalityCode: undefined,
            addressPostalCode: undefined,
            addressProvince: undefined,
            addressCountry: undefined,
            phone: undefined,
            email: undefined,
          }
        : rest;
      const res = await fetch(`/api/bookings/${id}/travelers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setTravelerError(data.error ?? "No se pudo añadir el acompañante.");
        return;
      }
      setTravelers((prev) => [...prev, data.data]);
      setTravelerForm(EMPTY_TRAVELER_FORM);
      setAddingTraveler(false);
    } finally {
      setSavingTraveler(false);
    }
  }

  async function handleRemoveTraveler(travelerId: string) {
    if (!confirm("¿Eliminar este acompañante de la reserva?")) return;
    setTravelers((prev) => prev.filter((t) => t.id !== travelerId));
    await fetch(`/api/bookings/${id}/travelers/${travelerId}`, { method: "DELETE" });
  }

  if (loading || !booking) {
    return <p className="text-stone-400">Cargando…</p>;
  }

  const nights: string[] = [];
  for (
    let cursor = new Date(booking.checkInDate);
    cursor < new Date(booking.checkOutDate);
    cursor = addDays(cursor, 1)
  ) {
    nights.push(format(cursor, "yyyy-MM-dd"));
  }

  function isRequested(dateStr: string, type: string) {
    return services.some(
      (r) => r.date.slice(0, 10) === dateStr && r.type === type && r.status === "REQUESTED"
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <Link href="/admin/reservas" className="text-sm text-stone-400 hover:text-stone-700">
        ← Volver a reservas
      </Link>

      <div className="card p-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="font-serif text-2xl text-stone-800">
            {booking.guest.firstName} {booking.guest.lastName}
          </h1>
          <span className={`badge ${STATUS_COLORS[booking.status]}`}>
            {STATUS_LABELS[booking.status]}
          </span>
        </div>
        <p className="text-stone-500 text-sm mt-1">
          {getRoomDisplayName(booking)} · {formatDate(booking.checkInDate)} →{" "}
          {formatDate(booking.checkOutDate)} · {formatCurrency(booking.totalAmount)}
        </p>
        <p className="text-stone-400 text-xs mt-1">
          {booking.guest.email}
          {booking.guest.phone ? ` · ${booking.guest.phone}` : ""}
        </p>
      </div>

      <section className="card p-6">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
          <h2 className="font-medium text-stone-700">Datos del huésped y verificación policial</h2>
          {!editingGuest && (
            <button
              onClick={openGuestEdit}
              className="chip bg-stone-100 text-stone-600 border-stone-200 hover:bg-stone-200"
            >
              ✏️ Editar datos
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <span
            className={cn(
              "badge",
              booking.precheckinCompletedAt
                ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                : "bg-amber-100 text-amber-800 border-amber-200"
            )}
          >
            {booking.precheckinCompletedAt
              ? `✓ Precheckin/check-in completado · ${new Date(booking.precheckinCompletedAt).toLocaleDateString("es-ES")}`
              : "⏳ Precheckin/check-in pendiente"}
          </span>
          <span
            className={cn(
              "badge",
              booking.sesSubmittedAt
                ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                : booking.sesSubmissionError
                  ? "bg-red-100 text-red-700 border-red-200"
                  : "bg-stone-100 text-stone-500 border-stone-200"
            )}
            title={booking.sesSubmissionError ?? undefined}
          >
            {booking.sesSubmittedAt
              ? `✓ Enviado a Policía · ${new Date(booking.sesSubmittedAt).toLocaleDateString("es-ES")}`
              : booking.sesSubmissionError
                ? "⚠ Error al enviar a Policía"
                : "Sin enviar a Policía"}
          </span>
        </div>

        <div className="flex flex-wrap gap-2 mb-5">
          {!["CANCELLED", "CHECKED_OUT"].includes(booking.status) && (
            <button
              onClick={handleCopyPrecheckinLink}
              className="chip bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
            >
              🔗 Copiar enlace precheckin
            </button>
          )}
          {booking.status !== "CANCELLED" && (
            <button
              onClick={handleSendSes}
              disabled={sendingSes}
              className="chip bg-stone-700 text-white border-transparent hover:bg-stone-800"
            >
              {sendingSes ? "Enviando…" : booking.sesSubmittedAt ? "📤 Reenviar a Policía" : "📤 Enviar a Policía"}
            </button>
          )}
        </div>

        {editingGuest ? (
          <div className="border-t border-stone-100 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              <div>
                <label className="label mb-1">Nombre *</label>
                <input
                  type="text"
                  className="input w-full text-sm"
                  value={guestForm.firstName}
                  onChange={(e) => setGuestForm((f) => ({ ...f, firstName: e.target.value }))}
                />
              </div>
              <div>
                <label className="label mb-1">Primer apellido *</label>
                <input
                  type="text"
                  className="input w-full text-sm"
                  value={guestForm.lastName}
                  onChange={(e) => setGuestForm((f) => ({ ...f, lastName: e.target.value }))}
                />
              </div>
              <div>
                <label className="label mb-1">Segundo apellido</label>
                <input
                  type="text"
                  className="input w-full text-sm"
                  value={guestForm.secondLastName}
                  onChange={(e) => setGuestForm((f) => ({ ...f, secondLastName: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              <div>
                <label className="label mb-1">DNI / NIE / Pasaporte *</label>
                <input
                  type="text"
                  className="input w-full text-sm"
                  value={guestForm.documentId}
                  onChange={(e) => setGuestForm((f) => ({ ...f, documentId: e.target.value.toUpperCase() }))}
                />
              </div>
              {(detectDocumentType(guestForm.documentId || "X") === "DNI" ||
                detectDocumentType(guestForm.documentId || "X") === "NIE") && (
                <div>
                  <label className="label mb-1">Nº de soporte *</label>
                  <input
                    type="text"
                    className="input w-full text-sm"
                    value={guestForm.documentSupportNumber}
                    onChange={(e) =>
                      setGuestForm((f) => ({ ...f, documentSupportNumber: e.target.value.toUpperCase() }))
                    }
                    placeholder="Reverso del documento"
                  />
                </div>
              )}
              <div>
                <label className="label mb-1">Sexo *</label>
                <select
                  className="input w-full text-sm"
                  value={guestForm.sex}
                  onChange={(e) => setGuestForm((f) => ({ ...f, sex: e.target.value as "" | "H" | "M" }))}
                >
                  <option value="">Selecciona…</option>
                  <option value="H">Hombre</option>
                  <option value="M">Mujer</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              <div>
                <label className="label mb-1">Nacionalidad</label>
                <input
                  type="text"
                  className="input w-full text-sm"
                  value={guestForm.nationality}
                  onChange={(e) => setGuestForm((f) => ({ ...f, nationality: e.target.value.toUpperCase() }))}
                  placeholder="ESP"
                />
              </div>
              <div>
                <label className="label mb-1">Fecha de nacimiento</label>
                <input
                  type="date"
                  className="input w-full text-sm"
                  value={guestForm.birthDate}
                  onChange={(e) => setGuestForm((f) => ({ ...f, birthDate: e.target.value }))}
                />
              </div>
              <div>
                <label className="label mb-1">Teléfono</label>
                <input
                  type="text"
                  className="input w-full text-sm"
                  value={guestForm.phone}
                  onChange={(e) => setGuestForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>
            </div>

            <p className="text-xs uppercase tracking-widest text-stone-400 mt-4 mb-2">Dirección de residencia</p>
            <div className="mb-3">
              <label className="label mb-1">Dirección (calle y número) *</label>
              <input
                type="text"
                className="input w-full text-sm"
                value={guestForm.addressStreet}
                onChange={(e) => setGuestForm((f) => ({ ...f, addressStreet: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
              <div>
                <label className="label mb-1">Municipio *</label>
                <input
                  type="text"
                  className="input w-full text-sm"
                  value={guestForm.addressCity}
                  onChange={(e) => setGuestForm((f) => ({ ...f, addressCity: e.target.value }))}
                />
              </div>
              <div>
                <label className="label mb-1">Cód. INE municipio *</label>
                <input
                  type="text"
                  className="input w-full text-sm"
                  value={guestForm.addressMunicipalityCode}
                  onChange={(e) => setGuestForm((f) => ({ ...f, addressMunicipalityCode: e.target.value }))}
                  placeholder="5 dígitos"
                  maxLength={5}
                />
              </div>
              <div>
                <label className="label mb-1">C.P. *</label>
                <input
                  type="text"
                  className="input w-full text-sm"
                  value={guestForm.addressPostalCode}
                  onChange={(e) => setGuestForm((f) => ({ ...f, addressPostalCode: e.target.value }))}
                />
              </div>
              <div>
                <label className="label mb-1">Provincia</label>
                <input
                  type="text"
                  className="input w-full text-sm"
                  value={guestForm.addressProvince}
                  onChange={(e) => setGuestForm((f) => ({ ...f, addressProvince: e.target.value }))}
                />
              </div>
              <div>
                <label className="label mb-1">País *</label>
                <input
                  type="text"
                  className="input w-full text-sm"
                  value={guestForm.addressCountry}
                  onChange={(e) => setGuestForm((f) => ({ ...f, addressCountry: e.target.value.toUpperCase() }))}
                  placeholder="ES"
                />
              </div>
            </div>

            {guestError && <p className="text-xs text-red-600 mb-3">{guestError}</p>}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setEditingGuest(false)}
                className="btn-ghost text-sm"
                disabled={savingGuest}
              >
                Cancelar
              </button>
              <button onClick={saveGuest} className="btn-primary text-sm" disabled={savingGuest}>
                {savingGuest ? "Guardando…" : "Guardar datos"}
              </button>
            </div>
          </div>
        ) : (
          <dl className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-3 text-sm border-t border-stone-100 pt-4">
            <div>
              <dt className="text-stone-400 text-xs">Nombre completo</dt>
              <dd className="text-stone-700">
                {booking.guest.firstName} {booking.guest.lastName} {booking.guest.secondLastName ?? ""}
              </dd>
            </div>
            <div>
              <dt className="text-stone-400 text-xs">Documento</dt>
              <dd className="text-stone-700">
                {detectDocumentType(booking.guest.documentId)} {booking.guest.documentId}
                {booking.guest.documentSupportNumber ? ` (soporte ${booking.guest.documentSupportNumber})` : ""}
              </dd>
            </div>
            <div>
              <dt className="text-stone-400 text-xs">Sexo</dt>
              <dd className="text-stone-700">
                {booking.guest.sex ? SEX_LABELS[booking.guest.sex] : <span className="text-amber-600">Sin indicar</span>}
              </dd>
            </div>
            <div>
              <dt className="text-stone-400 text-xs">Nacionalidad</dt>
              <dd className="text-stone-700">{booking.guest.nationality ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-stone-400 text-xs">Fecha de nacimiento</dt>
              <dd className="text-stone-700">
                {booking.guest.birthDate ? formatDate(booking.guest.birthDate) : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-stone-400 text-xs">Teléfono</dt>
              <dd className="text-stone-700">{booking.guest.phone ?? "—"}</dd>
            </div>
            <div className="md:col-span-3">
              <dt className="text-stone-400 text-xs">Dirección de residencia</dt>
              <dd className="text-stone-700">
                {[
                  booking.guest.addressStreet,
                  booking.guest.addressPostalCode,
                  booking.guest.addressCity,
                  booking.guest.addressProvince,
                  booking.guest.addressCountry,
                ]
                  .filter(Boolean)
                  .join(", ") || <span className="text-amber-600">Sin indicar</span>}
              </dd>
            </div>
          </dl>
        )}
      </section>

      <section className="card p-6">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
          <h2 className="font-medium text-stone-700">Acompañantes</h2>
        </div>
        <p className="text-sm text-stone-500 mb-4">
          El parte de viajeros exige reportar a todos los huéspedes, no solo al titular.
        </p>

        {travelers.length > 0 && (
          <ul className="mb-4 space-y-2">
            {travelers.map((t) => (
              <li
                key={t.id}
                className="flex items-start justify-between gap-2 bg-stone-50 border border-stone-200 rounded px-3 py-2 text-sm"
              >
                <div>
                  <p className="text-stone-800">
                    {t.firstName} {t.lastName} {t.secondLastName ?? ""}
                    {t.documentId
                      ? ` · ${detectDocumentType(t.documentId)} ${t.documentId}${
                          t.documentSupportNumber ? ` (soporte ${t.documentSupportNumber})` : ""
                        }`
                      : " · Sin documento (menor de edad)"}
                  </p>
                  <p className="text-xs text-stone-500 mt-0.5">
                    {[
                      t.sex ? SEX_LABELS[t.sex] : null,
                      t.birthDate ? formatDate(t.birthDate) : null,
                      t.nationality,
                      t.relationshipToLead ? `Parentesco: ${t.relationshipToLead}` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "Sin más datos"}
                  </p>
                  {(t.addressStreet || t.phone || t.email) && (
                    <p className="text-xs text-stone-400 mt-0.5">
                      {[
                        t.addressStreet,
                        t.addressPostalCode,
                        t.addressCity,
                        t.addressProvince,
                        t.addressCountry,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                      {t.phone ? ` · ${t.phone}` : ""}
                      {t.email ? ` · ${t.email}` : ""}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleRemoveTraveler(t.id)}
                  className="text-red-600 hover:text-red-800 text-xs flex-shrink-0"
                >
                  Eliminar
                </button>
              </li>
            ))}
          </ul>
        )}

        {addingTraveler ? (
          <form onSubmit={handleAddTraveler} className="border-t border-stone-100 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              <div>
                <label className="label mb-1">Nombre *</label>
                <input
                  type="text"
                  className="input w-full text-sm"
                  value={travelerForm.firstName}
                  onChange={(e) => setTravelerForm((f) => ({ ...f, firstName: e.target.value }))}
                />
              </div>
              <div>
                <label className="label mb-1">Primer apellido *</label>
                <input
                  type="text"
                  className="input w-full text-sm"
                  value={travelerForm.lastName}
                  onChange={(e) => setTravelerForm((f) => ({ ...f, lastName: e.target.value }))}
                />
              </div>
              <div>
                <label className="label mb-1">Segundo apellido</label>
                <input
                  type="text"
                  className="input w-full text-sm"
                  value={travelerForm.secondLastName}
                  onChange={(e) => setTravelerForm((f) => ({ ...f, secondLastName: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              <div>
                <label className="label mb-1">Fecha de nacimiento</label>
                <input
                  type="date"
                  className="input w-full text-sm"
                  value={travelerForm.birthDate}
                  onChange={(e) => setTravelerForm((f) => ({ ...f, birthDate: e.target.value }))}
                />
              </div>
              {isMinorDob(travelerForm.birthDate) ? (
                <div className="md:col-span-2">
                  <label className="label mb-1">Parentesco con el titular *</label>
                  <input
                    type="text"
                    className="input w-full text-sm"
                    value={travelerForm.relationshipToLead}
                    onChange={(e) => setTravelerForm((f) => ({ ...f, relationshipToLead: e.target.value }))}
                    placeholder="Ej. hijo/a, nieto/a…"
                  />
                </div>
              ) : (
                <>
                  <div>
                    <label className="label mb-1">DNI / NIE / Pasaporte *</label>
                    <input
                      type="text"
                      className="input w-full text-sm"
                      value={travelerForm.documentId}
                      onChange={(e) =>
                        setTravelerForm((f) => ({ ...f, documentId: e.target.value.toUpperCase() }))
                      }
                    />
                  </div>
                  {(detectDocumentType(travelerForm.documentId || "X") === "DNI" ||
                    detectDocumentType(travelerForm.documentId || "X") === "NIE") && (
                    <div>
                      <label className="label mb-1">Nº de soporte *</label>
                      <input
                        type="text"
                        className="input w-full text-sm"
                        value={travelerForm.documentSupportNumber}
                        onChange={(e) =>
                          setTravelerForm((f) => ({
                            ...f,
                            documentSupportNumber: e.target.value.toUpperCase(),
                          }))
                        }
                      />
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              <div>
                <label className="label mb-1">Nacionalidad</label>
                <input
                  type="text"
                  className="input w-full text-sm"
                  value={travelerForm.nationality}
                  onChange={(e) => setTravelerForm((f) => ({ ...f, nationality: e.target.value.toUpperCase() }))}
                  placeholder="ESP"
                />
              </div>
              <div>
                <label className="label mb-1">Sexo</label>
                <select
                  className="input w-full text-sm"
                  value={travelerForm.sex}
                  onChange={(e) => setTravelerForm((f) => ({ ...f, sex: e.target.value as "" | "H" | "M" }))}
                >
                  <option value="">Selecciona…</option>
                  <option value="H">Hombre</option>
                  <option value="M">Mujer</option>
                </select>
              </div>
              <div>
                <label className="label mb-1">Teléfono</label>
                <input
                  type="text"
                  className="input w-full text-sm"
                  value={travelerForm.phone}
                  onChange={(e) => setTravelerForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder={travelerForm.sameAddressAsLead ? "Opcional (usa el del titular)" : ""}
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-stone-600 mb-3">
              <input
                type="checkbox"
                checked={travelerForm.sameAddressAsLead}
                onChange={(e) => setTravelerForm((f) => ({ ...f, sameAddressAsLead: e.target.checked }))}
              />
              Vive en la misma dirección que el titular ({booking.guest.addressStreet || "…"})
            </label>

            {!travelerForm.sameAddressAsLead && (
              <div className="border border-stone-200 rounded p-3 mb-3">
                <div className="mb-3">
                  <label className="label mb-1">Dirección (calle y número) *</label>
                  <input
                    type="text"
                    className="input w-full text-sm"
                    value={travelerForm.addressStreet}
                    onChange={(e) => setTravelerForm((f) => ({ ...f, addressStreet: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                  <div>
                    <label className="label mb-1">Municipio *</label>
                    <input
                      type="text"
                      className="input w-full text-sm"
                      value={travelerForm.addressCity}
                      onChange={(e) => setTravelerForm((f) => ({ ...f, addressCity: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="label mb-1">Cód. INE municipio *</label>
                    <input
                      type="text"
                      className="input w-full text-sm"
                      value={travelerForm.addressMunicipalityCode}
                      onChange={(e) =>
                        setTravelerForm((f) => ({ ...f, addressMunicipalityCode: e.target.value }))
                      }
                      maxLength={5}
                    />
                  </div>
                  <div>
                    <label className="label mb-1">C.P. *</label>
                    <input
                      type="text"
                      className="input w-full text-sm"
                      value={travelerForm.addressPostalCode}
                      onChange={(e) => setTravelerForm((f) => ({ ...f, addressPostalCode: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="label mb-1">País *</label>
                    <input
                      type="text"
                      className="input w-full text-sm"
                      value={travelerForm.addressCountry}
                      onChange={(e) =>
                        setTravelerForm((f) => ({ ...f, addressCountry: e.target.value.toUpperCase() }))
                      }
                      placeholder="ES"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="label mb-1">Provincia</label>
                    <input
                      type="text"
                      className="input w-full text-sm"
                      value={travelerForm.addressProvince}
                      onChange={(e) => setTravelerForm((f) => ({ ...f, addressProvince: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="label mb-1">Email</label>
                    <input
                      type="email"
                      className="input w-full text-sm"
                      value={travelerForm.email}
                      onChange={(e) => setTravelerForm((f) => ({ ...f, email: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            )}

            {travelerError && <p className="text-xs text-red-600 mb-3">{travelerError}</p>}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setAddingTraveler(false);
                  setTravelerError("");
                }}
                className="btn-ghost text-sm"
                disabled={savingTraveler}
              >
                Cancelar
              </button>
              <button type="submit" className="btn-primary text-sm" disabled={savingTraveler}>
                {savingTraveler ? "Guardando…" : "Añadir acompañante"}
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => {
              setTravelerForm(EMPTY_TRAVELER_FORM);
              setAddingTraveler(true);
            }}
            className="chip bg-stone-100 text-stone-600 border-stone-200 hover:bg-stone-200"
          >
            + Añadir acompañante
          </button>
        )}
      </section>

      <section className="card p-6">
        <h2 className="font-medium text-stone-700 mb-4">Servicios diarios</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth: 480 }}>
            <thead>
              <tr>
                <th className="text-left py-2 pr-4 text-stone-400 font-medium whitespace-nowrap">Día</th>
                {SERVICE_META.map((meta) => (
                  <th
                    key={meta.type}
                    className="text-center py-2 px-3 text-stone-400 font-medium whitespace-nowrap"
                  >
                    {meta.icon} {meta.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {nights.map((dateStr) => (
                <tr key={dateStr} className="border-t border-stone-100">
                  <td className="py-2 pr-4 text-stone-600 whitespace-nowrap">{formatDate(dateStr)}</td>
                  {SERVICE_META.map((meta) => {
                    const active = isRequested(dateStr, meta.type);
                    const key = `${dateStr}-${meta.type}`;
                    return (
                      <td key={meta.type} className="text-center py-2 px-3">
                        <button
                          disabled={toggling === key}
                          onClick={() => toggleService(dateStr, meta.type, !active)}
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card p-6">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
          <h2 className="font-medium text-stone-700">Chat con el huésped</h2>
          <button
            onClick={handleClearGuestChat}
            disabled={clearingChat}
            className="chip bg-white text-stone-600 border-stone-200 hover:bg-stone-50"
          >
            {clearingChat ? "Ocultando…" : "Ocultar chat al huésped"}
          </button>
        </div>
        {booking.guestChatClearedAt && (
          <p className="text-xs text-stone-400 mb-3">
            Oculto al huésped desde el {new Date(booking.guestChatClearedAt).toLocaleString("es-ES")}
            {" "}— este historial completo solo lo ves tú.
          </p>
        )}
        <div className="space-y-2 max-h-80 overflow-y-auto mb-4 pr-1">
          {messages.length === 0 && (
            <p className="text-stone-400 text-sm">Todavía no hay mensajes.</p>
          )}
          {messages.map((m) => (
            <div
              key={m.id}
              className={cn(
                "max-w-[75%] rounded-lg px-3 py-2 text-sm",
                m.sender === "STAFF"
                  ? "ml-auto bg-villalen-600 text-white"
                  : "bg-stone-100 text-stone-800"
              )}
            >
              <p>{m.body}</p>
              <p className="text-[10px] opacity-70 mt-1">
                {new Date(m.createdAt).toLocaleString("es-ES")}
              </p>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={messageBody}
            onChange={(e) => setMessageBody(e.target.value)}
            placeholder="Escribe una respuesta…"
            className="input flex-1"
            onKeyDown={(e) => {
              if (e.key === "Enter") sendMessage();
            }}
          />
          <button
            onClick={sendMessage}
            disabled={sending || !messageBody.trim()}
            className="btn-primary"
          >
            Enviar
          </button>
        </div>
      </section>
    </div>
  );
}
