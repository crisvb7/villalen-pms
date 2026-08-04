"use client";
// app/reserva/page.tsx
// Motor de Reservas Público — Paso a paso
// El huésped elige un TIPO de habitación (Doble / Apartamento), no una
// habitación física concreta — el personal asigna la habitación real desde
// el backoffice antes de la llegada (ver /admin/calendario).
// Si hay Stripe configurado (NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY), el paso 3
// guarda la tarjeta del huésped (tokenizada) y la reserva queda confirmada
// al momento. Si no, se mantiene el flujo original de transferencia bancaria.

import { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { format, parseISO, differenceInDays, isValid } from "date-fns";
import { es } from "date-fns/locale";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

type RoomTypeKey = "DOUBLE" | "APARTMENT";

interface RoomTypeOption {
  type: RoomTypeKey;
  available: boolean;
  price: number;
  capacity: number;
}

const ROOM_TYPE_CONTENT: Record<
  RoomTypeKey,
  { label: string; description: string; amenities: string[]; images: string[]; imageAlt: string }
> = {
  DOUBLE: {
    label: "Habitación Doble",
    description:
      "Habitación acogedora con cama doble y baño privado, pensada para una estancia cómoda en plena naturaleza asturiana. Cada una de nuestras habitaciones dobles tiene su propia decoración e identidad — las que te enseñamos aquí son un ejemplo.",
    amenities: ["WiFi", "Calefacción", "Baño privado", "Ropa de cama incluida"],
    images: [
      "/images/rooms/doble-1.jpg",
      "/images/rooms/doble-2.jpg",
      "/images/rooms/doble-3.jpg",
      "/images/rooms/doble-4.jpg",
      "/images/rooms/doble-5.jpg",
    ],
    imageAlt: "Habitación doble de Villalén",
  },
  APARTMENT: {
    label: "Apartamento",
    description:
      "Dos habitaciones unidas con un único baño — ideal para familias o grupos que buscan más espacio e independencia dentro de la casa.",
    amenities: ["WiFi", "Calefacción", "Baño privado", "Más espacio", "Ideal para grupos"],
    images: [
      "/images/rooms/apartamento-1.jpg",
      "/images/rooms/apartamento-2.jpg",
      "/images/rooms/apartamento-3.jpg",
      "/images/rooms/apartamento-4.jpg",
    ],
    imageAlt: "Apartamento del Trasgu en Villalén",
  },
};

// ── Galería con auto-fundido para las tarjetas de tipo de alojamiento ──────
function RoomTypeGallery({ images, alt }: { images: string[]; alt: string }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % images.length);
    }, 2800);
    return () => clearInterval(id);
  }, [images.length]);

  return (
    <div className="relative h-48 md:h-36 w-full md:w-48 flex-shrink-0 bg-stone-100 overflow-hidden">
      {images.map((src, i) => (
        <Image
          key={src}
          src={src}
          alt={alt}
          fill
          sizes="(min-width: 768px) 192px, 100vw"
          priority={i === 0}
          className={`object-cover transition-opacity duration-1000 ease-in-out ${
            i === index ? "opacity-100" : "opacity-0"
          }`}
        />
      ))}
    </div>
  );
}

interface BookingConfirmation {
  id: string;
  totalAmount: string;
  status: string;
  roomType: RoomTypeKey;
  checkInDate: string;
  checkOutDate: string;
  guest: { firstName: string; lastName: string; email: string };
}

type Step = "search" | "results" | "form" | "success";

const formatCurrency = (amount: string | number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(
    Number(amount)
  );

const formatDateEs = (d: string) =>
  format(parseISO(d), "d 'de' MMMM 'de' yyyy", { locale: es });

interface GuestForm {
  firstName: string;
  lastName: string;
  documentId: string;
  email: string;
  phone: string;
  notes: string;
}

// ── Paso 3: formulario de datos + tokenización de tarjeta ──────────────────
function BookingFormStep({
  selectedType,
  checkIn,
  checkOut,
  guests,
  nights,
  onBack,
  onSuccess,
}: {
  selectedType: RoomTypeOption;
  checkIn: string;
  checkOut: string;
  guests: number;
  nights: number;
  onBack: () => void;
  onSuccess: (confirmation: BookingConfirmation) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const stripeEnabled = Boolean(publishableKey);

  const [guestForm, setGuestForm] = useState<GuestForm>({
    firstName: "",
    lastName: "",
    documentId: "",
    email: "",
    phone: "",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      let stripeCustomerId: string | undefined;
      let stripePaymentMethodId: string | undefined;

      if (stripeEnabled) {
        if (!stripe || !elements) {
          throw new Error("El formulario de pago aún se está cargando. Inténtalo de nuevo.");
        }
        const cardElement = elements.getElement(CardElement);
        if (!cardElement) {
          throw new Error("No se pudo leer los datos de la tarjeta.");
        }

        const setupRes = await fetch("/api/payments/setup-intent", { method: "POST" });
        const setupData = await setupRes.json();
        if (!setupRes.ok) throw new Error(setupData.error ?? "No se pudo iniciar el pago.");

        const { error: stripeError, setupIntent } = await stripe.confirmCardSetup(
          setupData.data.clientSecret,
          {
            payment_method: {
              card: cardElement,
              billing_details: {
                name: `${guestForm.firstName} ${guestForm.lastName}`.trim(),
                email: guestForm.email,
              },
            },
          }
        );

        if (stripeError) throw new Error(stripeError.message ?? "La tarjeta fue rechazada.");
        if (!setupIntent?.payment_method) {
          throw new Error("No se pudo guardar la tarjeta.");
        }

        stripeCustomerId = setupData.data.customerId;
        stripePaymentMethodId =
          typeof setupIntent.payment_method === "string"
            ? setupIntent.payment_method
            : setupIntent.payment_method.id;
      }

      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomType: selectedType.type,
          checkInDate: checkIn,
          checkOutDate: checkOut,
          adults: guests,
          notes: guestForm.notes,
          source: "WEB",
          stripeCustomerId,
          stripePaymentMethodId,
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
      onSuccess(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear la reserva.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <button onClick={onBack} className="btn-ghost mb-4 -ml-2">
          ← Volver a habitaciones
        </button>
        <h2 className="font-serif text-3xl text-stone-800">Tus datos</h2>
      </div>

      <div className="card p-5 mb-6 bg-amber-50 border-amber-200">
        <div className="flex justify-between items-start">
          <div>
            <p className="font-medium text-stone-800">{ROOM_TYPE_CONTENT[selectedType.type].label}</p>
            <p className="text-sm text-stone-500 mt-0.5">
              {checkIn && formatDateEs(checkIn)} → {checkOut && formatDateEs(checkOut)}
            </p>
            <p className="text-sm text-stone-500">
              {nights} {nights === 1 ? "noche" : "noches"} · {guests}{" "}
              {guests === 1 ? "persona" : "personas"}
            </p>
          </div>
          <div className="text-right">
            <p className="font-serif text-2xl text-stone-900">
              {formatCurrency(selectedType.price * nights)}
            </p>
            <p className="text-xs text-stone-400">Total estimado</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="label mb-2">Nombre *</label>
            <input
              type="text"
              className="input"
              placeholder="María"
              value={guestForm.firstName}
              onChange={(e) => setGuestForm({ ...guestForm, firstName: e.target.value })}
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
              onChange={(e) => setGuestForm({ ...guestForm, lastName: e.target.value })}
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
                setGuestForm({ ...guestForm, documentId: e.target.value.toUpperCase() })
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
              onChange={(e) => setGuestForm({ ...guestForm, phone: e.target.value })}
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
            onChange={(e) => setGuestForm({ ...guestForm, email: e.target.value })}
            required
          />
          {!stripeEnabled && (
            <p className="text-xs text-stone-400 mt-1">
              Recibirás las instrucciones de pago en este correo.
            </p>
          )}
        </div>

        <div className="mb-8">
          <label className="label mb-2">Comentarios (opcional)</label>
          <textarea
            className="input resize-none"
            rows={3}
            placeholder="Llegada tardía, alergias, ocasión especial…"
            value={guestForm.notes}
            onChange={(e) => setGuestForm({ ...guestForm, notes: e.target.value })}
          />
        </div>

        {stripeEnabled ? (
          <div className="mb-6">
            <label className="label mb-2">Tarjeta (como garantía) *</label>
            <div className="input py-3">
              <CardElement options={{ style: { base: { fontSize: "16px" } } }} />
            </div>
            <p className="text-xs text-stone-400 mt-2">
              🔒 No se realiza ningún cargo ahora. Guardamos tu tarjeta como garantía y
              te cobraremos el importe total más adelante, una vez pase el plazo de
              cancelación gratuita.
            </p>
          </div>
        ) : (
          <div className="bg-stone-50 border border-stone-200 p-4 mb-6 text-sm text-stone-500">
            <p className="font-medium text-stone-700 mb-1">💳 Sin pago ahora</p>
            <p>
              Esta reserva quedará como <strong>PENDIENTE</strong>. En breve recibirás
              un email con los datos para realizar el pago por{" "}
              <strong>transferencia bancaria</strong>. La reserva se confirmará al
              recibir el ingreso.
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
          disabled={loading || (stripeEnabled && (!stripe || !elements))}
        >
          {loading ? "Procesando…" : "Confirmar solicitud de reserva →"}
        </button>
      </form>
    </div>
  );
}

function ReservaPageContent() {
  const searchParams = useSearchParams();

  const [step, setStep] = useState<Step>("search");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(2);
  const [roomTypes, setRoomTypes] = useState<RoomTypeOption[]>([]);
  const [selectedType, setSelectedType] = useState<RoomTypeOption | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState<BookingConfirmation | null>(null);

  const today = format(new Date(), "yyyy-MM-dd");

  const nights =
    checkIn && checkOut
      ? Math.max(0, differenceInDays(parseISO(checkOut), parseISO(checkIn)))
      : 0;

  const performSearch = async (ci: string, co: string, g: number) => {
    setError("");
    setLoading(true);

    try {
      const res = await fetch(
        `/api/rooms/availability?checkIn=${ci}&checkOut=${co}&guests=${g}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRoomTypes(data.data);
      setStep("results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al buscar.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkIn || !checkOut || nights < 1) {
      setError("Selecciona fechas válidas (mínimo 1 noche).");
      return;
    }
    await performSearch(checkIn, checkOut, guests);
  };

  useEffect(() => {
    const qpCheckIn = searchParams.get("checkIn");
    const qpCheckOut = searchParams.get("checkOut");
    const qpGuests = searchParams.get("guests");

    if (!qpCheckIn || !qpCheckOut) return;

    const ci = parseISO(qpCheckIn);
    const co = parseISO(qpCheckOut);
    if (!isValid(ci) || !isValid(co) || ci >= co) return;

    const g = qpGuests ? Math.max(1, parseInt(qpGuests, 10) || 1) : 2;

    setCheckIn(qpCheckIn);
    setCheckOut(qpCheckOut);
    setGuests(g);
    performSearch(qpCheckIn, qpCheckOut, g);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectType = (type: RoomTypeOption) => {
    setSelectedType(type);
    setStep("form");
  };

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-4 flex items-center justify-between">
          <a href="https://www.villalen.es" className="group">
            <h1 className="font-serif text-xl text-stone-900 group-hover:text-amber-800 transition-colors">
              Villalén
            </h1>
            <p className="text-xs uppercase tracking-widest text-stone-400">
              Motor de Reservas
            </p>
          </a>
          <div className="hidden md:flex items-center gap-3 text-xs text-stone-400">
            {(["search", "results", "form", "success"] as Step[]).map(
              (s, i) => {
                const labels: Record<Step, string> = {
                  search: "1. Fechas",
                  results: "2. Tipo de alojamiento",
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

      {step === "search" && (
        <div className="relative h-[38vh] min-h-[260px]">
          <Image
            src="/images/hero-villalen.jpg"
            alt="Casa de aldea Villalén, en Cuerres, Ribadesella"
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-900/85 via-stone-900/20 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 mx-auto max-w-5xl px-6 py-8">
            <p className="text-xs uppercase tracking-[0.25em] text-white/70 mb-2">
              Cuerres, Ribadesella — Asturias
            </p>
            <h2 className="font-serif italic text-3xl md:text-4xl text-white">
              ¿Cuándo nos visitas?
            </h2>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-5xl px-6 py-12">
        {step === "search" && (
          <div className="max-w-2xl mx-auto">
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
                {loading ? "Buscando…" : "Ver disponibilidad →"}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-xs text-stone-400">
                🔒 Reserva segura. {publishableKey ? "Pago con tarjeta protegido por Stripe." : "Pago por transferencia bancaria al confirmar."}
              </p>
            </div>
          </div>
        )}

        {step === "results" && (
          <div>
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h2 className="font-serif text-3xl text-stone-800">
                  Tipos de alojamiento disponibles
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

            {roomTypes.length === 0 ? (
              <div className="card p-12 text-center">
                <p className="text-4xl mb-4">😔</p>
                <h3 className="font-serif text-2xl text-stone-700 mb-2">
                  No hay disponibilidad
                </h3>
                <p className="text-stone-500 mb-6">
                  No encontramos alojamiento libre para esas fechas o número
                  de huéspedes. Prueba con otras fechas.
                </p>
                <button onClick={() => setStep("search")} className="btn-secondary">
                  Cambiar fechas
                </button>
              </div>
            ) : (
              <div className="grid gap-4">
                {roomTypes.map((rt) => {
                  const content = ROOM_TYPE_CONTENT[rt.type];
                  const total = rt.price * nights;
                  return (
                    <div key={rt.type} className="card p-6 flex flex-col md:flex-row gap-6">
                      <RoomTypeGallery images={content.images} alt={content.imageAlt} />
                      <div className="flex-1">
                        <h3 className="font-serif text-2xl text-stone-800 mb-1">
                          {content.label}
                        </h3>
                        <p className="text-xs text-stone-400 mb-3">
                          Hasta {rt.capacity} personas
                        </p>
                        <p className="text-sm text-stone-500 mb-4 leading-relaxed">
                          {content.description}
                        </p>
                        <div className="flex flex-wrap gap-2 mb-4">
                          {content.amenities.map((a) => (
                            <span
                              key={a}
                              className="bg-stone-100 text-stone-600 text-xs px-2 py-1"
                            >
                              {a}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-col items-end justify-between min-w-[160px]">
                        <div className="text-right">
                          <p className="text-xs text-stone-400">
                            {formatCurrency(rt.price)} / noche
                          </p>
                          <p className="font-serif text-3xl text-stone-900">
                            {formatCurrency(total)}
                          </p>
                          <p className="text-xs text-stone-400">
                            {nights} {nights === 1 ? "noche" : "noches"} · IVA incl.
                          </p>
                        </div>
                        <button
                          onClick={() => handleSelectType(rt)}
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

        {step === "form" && selectedType && (
          <Elements stripe={stripePromise}>
            <BookingFormStep
              selectedType={selectedType}
              checkIn={checkIn}
              checkOut={checkOut}
              guests={guests}
              nights={nights}
              onBack={() => setStep("results")}
              onSuccess={(data) => {
                setConfirmation(data);
                setStep("success");
              }}
            />
          </Elements>
        )}

        {step === "success" && confirmation && (
          <div className="max-w-xl mx-auto text-center">
            <div className="card p-10">
              <div className="text-5xl mb-6">🎉</div>
              <p className="text-xs uppercase tracking-widest text-amber-700 mb-2">
                {confirmation.status === "CONFIRMED" ? "Reserva confirmada" : "Solicitud recibida"}
              </p>
              <h2 className="font-serif text-3xl text-stone-800 mb-4">
                ¡Gracias, {confirmation.guest.firstName}!
              </h2>
              <p className="text-stone-500 mb-6 leading-relaxed">
                {confirmation.status === "CONFIRMED" ? (
                  <>
                    Tu reserva está <strong>confirmada</strong>. Hemos guardado tu
                    tarjeta como garantía; no se ha realizado ningún cargo todavía.
                    Te enviaremos la confirmación a{" "}
                    <strong>{confirmation.guest.email}</strong>.
                  </>
                ) : (
                  <>
                    Hemos registrado tu solicitud de reserva correctamente. En breve
                    recibirás un email en <strong>{confirmation.guest.email}</strong>{" "}
                    con las instrucciones para realizar el pago por{" "}
                    <strong>transferencia bancaria</strong>. La reserva quedará
                    confirmada en cuanto recibamos el ingreso.
                  </>
                )}
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
                    {ROOM_TYPE_CONTENT[confirmation.roomType].label}
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
                    {formatCurrency(confirmation.totalAmount)}
                  </span>
                </div>
              </div>

              {confirmation.status !== "CONFIRMED" && (
                <div className="bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900 mb-8">
                  <p className="font-semibold mb-1">📧 Próximos pasos:</p>
                  <ol className="text-left space-y-1 list-decimal list-inside text-amber-800">
                    <li>Revisa tu bandeja de entrada (y spam).</li>
                    <li>Realiza la transferencia con el importe indicado.</li>
                    <li>Te enviaremos la confirmación definitiva en 24h.</li>
                  </ol>
                </div>
              )}

              <a href="https://www.villalen.es" className="btn-secondary w-full justify-center">
                ← Volver a villalen.es
              </a>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function ReservaPage() {
  return (
    <Suspense>
      <ReservaPageContent />
    </Suspense>
  );
}
