// app/api/payments/setup-intent/route.ts
// Paso previo a crear la reserva: tokeniza la tarjeta del huésped con
// Stripe (SetupIntent) sin depender todavía de que exista un Booking.

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { createSetupIntent, isStripeConfigured } from "@/lib/services/stripe.service";

export async function POST() {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "El pago con tarjeta no está disponible ahora mismo." },
      { status: 503 }
    );
  }

  try {
    const { clientSecret, customerId } = await createSetupIntent();
    return NextResponse.json({ data: { clientSecret, customerId } });
  } catch (error) {
    console.error("[POST /api/payments/setup-intent]", error);
    return NextResponse.json(
      { error: "No se pudo iniciar el guardado de la tarjeta." },
      { status: 500 }
    );
  }
}
