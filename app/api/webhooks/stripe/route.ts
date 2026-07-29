// app/api/webhooks/stripe/route.ts
// Mantiene depositPaid sincronizado cuando Stripe resuelve un cargo
// off_session de forma asíncrona (recomendado por Stripe para este flujo).

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");

  if (!webhookSecret || !signature) {
    return NextResponse.json({ error: "Webhook no configurado." }, { status: 400 });
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = Stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    console.error("[Stripe Webhook] Firma inválida:", error);
    return NextResponse.json({ error: "Firma inválida." }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const intent = event.data.object as Stripe.PaymentIntent;
        await prisma.booking.updateMany({
          where: { stripePaymentIntentId: intent.id },
          data: { depositPaid: true },
        });
        console.log(`[Stripe Webhook] ✅ Cobro confirmado: ${intent.id}`);
        break;
      }
      case "payment_intent.payment_failed": {
        const intent = event.data.object as Stripe.PaymentIntent;
        console.error(`[Stripe Webhook] ❌ Cobro fallido: ${intent.id} — ${intent.last_payment_error?.message}`);
        break;
      }
      default:
        break;
    }
  } catch (error) {
    console.error("[Stripe Webhook] Error al procesar evento:", error);
    return NextResponse.json({ error: "Error al procesar el evento." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
