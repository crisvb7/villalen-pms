// lib/services/stripe.service.ts
// TPV Virtual — Stripe.
//
// La tarjeta se teclea en el navegador del huésped mediante Stripe Elements
// (CardElement) y viaja directamente a Stripe: este servidor nunca ve ni
// almacena PAN/CVV, solo los IDs que devuelve Stripe (customer, payment
// method, payment intent). Ver aviso PCI-DSS en prisma/schema.prisma.
//
// Cobro: se tokeniza la tarjeta al reservar (SetupIntent) y el cargo del
// importe total se lanza manualmente desde el admin cuando el personal
// decide (botón "Cobrar ahora"), no de forma automática.

import Stripe from "stripe";

let client: Stripe | null | undefined;

function getClient(): Stripe | null {
  if (client !== undefined) return client;

  const secretKey = process.env.STRIPE_SECRET_KEY;
  client = secretKey ? new Stripe(secretKey) : null;
  return client;
}

export function isStripeConfigured(): boolean {
  return getClient() !== null;
}

/**
 * Crea un Customer vacío y un SetupIntent en modo off_session, para poder
 * guardar la tarjeta del huésped como garantía y cargarla más adelante sin
 * que esté presente.
 */
export async function createSetupIntent(): Promise<{
  clientSecret: string;
  customerId: string;
}> {
  const stripe = getClient();
  if (!stripe) {
    throw new Error("Stripe no está configurado (falta STRIPE_SECRET_KEY).");
  }

  const customer = await stripe.customers.create();

  const setupIntent = await stripe.setupIntents.create({
    customer: customer.id,
    payment_method_types: ["card"],
    usage: "off_session",
  });

  if (!setupIntent.client_secret) {
    throw new Error("Stripe no devolvió client_secret para el SetupIntent.");
  }

  return { clientSecret: setupIntent.client_secret, customerId: customer.id };
}

interface ChargeableBooking {
  id: string;
  totalAmount: number | string;
  stripeCustomerId: string | null;
  stripePaymentMethodId: string | null;
}

/**
 * Cobra el importe total de la reserva contra la tarjeta guardada. Lanza si
 * Stripe rechaza el cargo (rechazo, 3DS requerido, etc.) — la ruta que
 * llama a esta función traduce el error a una respuesta legible.
 */
export async function chargeBooking(
  booking: ChargeableBooking
): Promise<Stripe.PaymentIntent> {
  const stripe = getClient();
  if (!stripe) {
    throw new Error("Stripe no está configurado (falta STRIPE_SECRET_KEY).");
  }
  if (!booking.stripeCustomerId || !booking.stripePaymentMethodId) {
    throw new Error("Esta reserva no tiene una tarjeta guardada en Stripe.");
  }

  const amountInCents = Math.round(Number(booking.totalAmount) * 100);

  return stripe.paymentIntents.create({
    amount: amountInCents,
    currency: "eur",
    customer: booking.stripeCustomerId,
    payment_method: booking.stripePaymentMethodId,
    off_session: true,
    confirm: true,
    description: `Reserva ${booking.id}`,
    metadata: { bookingId: booking.id },
  });
}
