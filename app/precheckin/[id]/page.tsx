"use client";
// app/precheckin/[id]/page.tsx
// Página pública (sin login) para que el huésped complete/corrija sus datos
// antes de llegar, opcionalmente escaneando su documento (MRZ) desde el móvil.

import { useEffect, useRef, useState } from "react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { scanMrzFromImage } from "@/lib/utils/mrz-scan";
import { ROOM_TYPE_LABELS, detectDocumentType } from "@/lib/utils";

interface BookingInfo {
  id: string;
  checkInDate: string;
  checkOutDate: string;
  status: string;
  precheckinCompletedAt: string | null;
  roomType: string;
  room: { name: string } | null;
  guest: {
    firstName: string;
    lastName: string;
    secondLastName: string | null;
    documentId: string;
    documentSupportNumber: string | null;
    email: string;
    phone: string | null;
    nationality: string | null;
    birthDate: string | null;
    sex: "H" | "M" | null;
    addressStreet: string | null;
    addressCity: string | null;
    addressPostalCode: string | null;
    addressProvince: string | null;
    addressCountry: string | null;
  };
}

const formatDateEs = (d: string) => format(parseISO(d), "d 'de' MMMM 'de' yyyy", { locale: es });

export default function PrecheckinPage({ params }: { params: { id: string } }) {
  const [booking, setBooking] = useState<BookingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [form, setForm] = useState({
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
    addressPostalCode: "",
    addressProvince: "",
    addressCountry: "",
  });

  const [scanning, setScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`/api/bookings/${params.id}/precheckin`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => {
        const b: BookingInfo = data.data;
        setBooking(b);
        setForm({
          firstName: b.guest.firstName,
          lastName: b.guest.lastName,
          secondLastName: b.guest.secondLastName ?? "",
          documentId: b.guest.documentId,
          documentSupportNumber: b.guest.documentSupportNumber ?? "",
          nationality: b.guest.nationality ?? "",
          birthDate: b.guest.birthDate ? format(parseISO(b.guest.birthDate), "yyyy-MM-dd") : "",
          sex: b.guest.sex ?? "",
          phone: b.guest.phone ?? "",
          addressStreet: b.guest.addressStreet ?? "",
          addressCity: b.guest.addressCity ?? "",
          addressPostalCode: b.guest.addressPostalCode ?? "",
          addressProvince: b.guest.addressProvince ?? "",
          addressCountry: b.guest.addressCountry ?? "ES",
        });
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [params.id]);

  const handleScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanning(true);
    setScanMessage("");
    try {
      const result = await scanMrzFromImage(file);
      if (!result) {
        setScanMessage("No se pudo leer el documento automáticamente. Rellena los datos a mano, por favor.");
        return;
      }
      setForm((prev) => ({
        ...prev,
        firstName: result.firstName || prev.firstName,
        lastName: result.lastName || prev.lastName,
        documentId: result.documentId || prev.documentId,
        nationality: result.nationality || prev.nationality,
        birthDate: result.birthDate || prev.birthDate,
        sex: result.sex || prev.sex,
        documentSupportNumber: result.documentSupportNumber || prev.documentSupportNumber,
      }));
      setScanMessage("Documento leído. Revisa que los datos sean correctos antes de continuar.");
    } finally {
      setScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const documentType = form.documentId ? detectDocumentType(form.documentId) : null;
  const needsSupportNumber = documentType === "DNI" || documentType === "NIE";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (needsSupportNumber && !form.documentSupportNumber.trim()) {
      setError("El número de soporte (dorso del DNI/NIE) es obligatorio.");
      return;
    }
    if (!form.sex || !form.addressStreet.trim() || !form.addressCity.trim() || !form.addressPostalCode.trim() || !form.addressCountry.trim()) {
      setError("Sexo y dirección completa son obligatorios para el parte de viajeros.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/bookings/${params.id}/precheckin`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar tus datos.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-stone-400">Cargando…</div>;
  }

  if (notFound || !booking) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center px-6">
        <p className="text-stone-500">No encontramos esta reserva. Comprueba el enlace.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-xl px-6 py-4">
          <h1 className="font-serif text-xl text-stone-900">Villalén</h1>
          <p className="text-xs uppercase tracking-widest text-stone-400">Precheckin</p>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-6 py-10">
        {done ? (
          <div className="card p-10 text-center">
            <div className="text-5xl mb-4">✅</div>
            <h2 className="font-serif text-2xl text-stone-800 mb-2">¡Precheckin completado!</h2>
            <p className="text-stone-500">
              Gracias, {form.firstName}. Ya tenemos tus datos listos para tu llegada el{" "}
              {formatDateEs(booking.checkInDate)}.
            </p>
          </div>
        ) : (
          <>
            <div className="card p-5 mb-6 bg-amber-50 border-amber-200">
              <p className="font-medium text-stone-800">
                {booking.room?.name ?? ROOM_TYPE_LABELS[booking.roomType]}
              </p>
              <p className="text-sm text-stone-500 mt-0.5">
                {formatDateEs(booking.checkInDate)} → {formatDateEs(booking.checkOutDate)}
              </p>
            </div>

            <div className="card p-6 mb-6">
              <h3 className="font-serif text-lg text-stone-800 mb-2">Escanear documento</h3>
              <p className="text-sm text-stone-500 mb-4">
                Haz una foto de tu DNI, NIE o pasaporte y rellenamos el formulario por ti. Es
                opcional — también puedes escribir los datos a mano.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleScan}
                className="hidden"
                id="doc-scan-input"
              />
              <label htmlFor="doc-scan-input" className="btn-secondary inline-block cursor-pointer">
                {scanning ? "Leyendo documento…" : "📷 Escanear documento"}
              </label>
              {scanMessage && <p className="text-xs text-stone-500 mt-3">{scanMessage}</p>}
            </div>

            <form onSubmit={handleSubmit} className="card p-6">
              <h3 className="font-serif text-lg text-stone-800 mb-4">Tus datos</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="label mb-2">Nombre *</label>
                  <input
                    type="text"
                    className="input"
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="label mb-2">Primer apellido *</label>
                  <input
                    type="text"
                    className="input"
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="label mb-2">Segundo apellido</label>
                  <input
                    type="text"
                    className="input"
                    value={form.secondLastName}
                    onChange={(e) => setForm({ ...form, secondLastName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label mb-2">Sexo *</label>
                  <select
                    className="input"
                    value={form.sex}
                    onChange={(e) => setForm({ ...form, sex: e.target.value as "" | "H" | "M" })}
                    required
                  >
                    <option value="">Selecciona…</option>
                    <option value="H">Hombre</option>
                    <option value="M">Mujer</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="label mb-2">DNI / NIE / Pasaporte *</label>
                  <input
                    type="text"
                    className="input"
                    value={form.documentId}
                    onChange={(e) => setForm({ ...form, documentId: e.target.value.toUpperCase() })}
                    required
                  />
                </div>
                <div>
                  <label className="label mb-2">Nacionalidad</label>
                  <input
                    type="text"
                    className="input"
                    value={form.nationality}
                    onChange={(e) => setForm({ ...form, nationality: e.target.value.toUpperCase() })}
                    placeholder="ESP"
                  />
                </div>
              </div>

              {needsSupportNumber && (
                <div className="mb-4">
                  <label className="label mb-2">Número de soporte (dorso del documento) *</label>
                  <input
                    type="text"
                    className="input"
                    value={form.documentSupportNumber}
                    onChange={(e) => setForm({ ...form, documentSupportNumber: e.target.value.toUpperCase() })}
                    placeholder="Ej. AAA000000"
                    required
                  />
                  <p className="text-xs text-stone-400 mt-1">
                    El número que aparece en el reverso del DNI/NIE, distinto del número de documento.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="label mb-2">Fecha de nacimiento</label>
                  <input
                    type="date"
                    className="input"
                    value={form.birthDate}
                    onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label mb-2">Teléfono</label>
                  <input
                    type="tel"
                    className="input"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="label mb-2">Email</label>
                <input type="email" className="input bg-stone-50" value={booking.guest.email} disabled />
              </div>

              <h3 className="font-serif text-lg text-stone-800 mb-1 mt-2">Dirección de residencia</h3>
              <p className="text-xs text-stone-400 mb-4">Exigida por el parte de viajeros a la policía.</p>

              <div className="mb-4">
                <label className="label mb-2">Dirección (calle y número) *</label>
                <input
                  type="text"
                  className="input"
                  value={form.addressStreet}
                  onChange={(e) => setForm({ ...form, addressStreet: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="label mb-2">Municipio *</label>
                  <input
                    type="text"
                    className="input"
                    value={form.addressCity}
                    onChange={(e) => setForm({ ...form, addressCity: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="label mb-2">Código postal *</label>
                  <input
                    type="text"
                    className="input"
                    value={form.addressPostalCode}
                    onChange={(e) => setForm({ ...form, addressPostalCode: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="label mb-2">Provincia</label>
                  <input
                    type="text"
                    className="input"
                    value={form.addressProvince}
                    onChange={(e) => setForm({ ...form, addressProvince: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label mb-2">País de residencia *</label>
                  <input
                    type="text"
                    className="input"
                    value={form.addressCountry}
                    onChange={(e) => setForm({ ...form, addressCountry: e.target.value.toUpperCase() })}
                    placeholder="ES"
                    required
                  />
                </div>
              </div>

              {error && (
                <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 p-3">{error}</p>
              )}

              <button type="submit" className="btn-primary w-full" disabled={saving}>
                {saving ? "Guardando…" : "Confirmar mis datos"}
              </button>
            </form>
          </>
        )}
      </main>
    </div>
  );
}
