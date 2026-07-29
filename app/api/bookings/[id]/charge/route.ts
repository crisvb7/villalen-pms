// app/api/bookings/[id]/charge/route.ts
// Cobro manual del importe total de una reserva contra la tarjeta guardada
// en Stripe. Lo dispara el personal desde el admin ("Cobrar ahora"),
// nunca de forma automática.

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { chargeBooking, isStripeConfigured } from "@/lib/services/stripe.service";
import { requireAuth } from "@/lib/auth";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Stripe no está configurado (falta STRIPE_SECRET_KEY)." },
      { status: 503 }
    );
  }

  try {
    const booking = await prisma.booking.findUnique({ where: { id: params.id } });
    if (!booking) {
      return NextResponse.json({ error: "Reserva no encontrada." }, { status: 404 });
    }
    if (!booking.stripePaymentMethodId || !booking.stripeCustomerId) {
      return NextResponse.json(
        { error: "Esta reserva no tiene una tarjeta guardada." },
        { status: 400 }
      );
    }
    if (booking.depositPaid) {
      return NextResponse.json({ error: "Esta reserva ya está cobrada." }, { status: 409 });
    }

    const paymentIntent = await chargeBooking({
      ...booking,
      totalAmount: booking.totalAmount.toString(),
    });

    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: {
        stripePaymentIntentId: paymentIntent.id,
        depositPaid: paymentIntent.status === "succeeded",
      },
      include: { guest: true, room: true },
    });

    if (paymentIntent.status !== "succeeded") {
      return NextResponse.json(
        { error: `El cobro no se completó (estado: ${paymentIntent.status}).`, data: updated },
        { status: 402 }
      );
    }

    return NextResponse.json({ message: "Cobro realizado correctamente.", data: updated });
  } catch (error) {
    console.error("[POST /api/bookings/:id/charge]", error);
    const msg = error instanceof Error ? error.message : "Error al procesar el cobro.";
    return NextResponse.json({ error: msg }, { status: 402 });
  }
}
