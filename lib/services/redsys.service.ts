// lib/services/redsys.service.ts
// TPV Virtual (Redsys / Caja Rural) — cobro de la garantía de tarjeta que se
// captura al reservar online. Ver README, sección "TPV Virtual", para el
// contexto completo y lo que hay que pedirle a Caja Rural antes de activarlo.
//
// Este archivo es la única pieza que falta conectar de verdad. Todo lo demás
// ya está construido y listo:
//   - Booking.cardGuaranteeToken / cardChargedAt / cardChargeError (schema.prisma)
//   - Botón "Cobrar reserva" en /admin/reservas
//   - POST /api/bookings/[id]/charge-guarantee (cobro manual)
//   - GET /api/cron/charge-guarantees (cobro automático, red de seguridad
//     para el día de la reserva como muy tarde — ver vercel.json)
// Mientras no haya credenciales de Redsys en REDSYS_* (.env.example),
// `chargeGuaranteedCard` no hace ninguna llamada real: siempre devuelve un
// error legible. En cuanto lleguen las credenciales Y se implemente la
// llamada REST real más abajo (marcada con TODO), todo lo anterior empieza a
// funcionar sin tocar nada más.

import { prisma } from "@/lib/prisma";
import { BookingStatus } from "@prisma/client";

function getConfig() {
  const merchantCode = process.env.REDSYS_MERCHANT_CODE;
  const terminal = process.env.REDSYS_TERMINAL;
  const secretKey = process.env.REDSYS_SECRET_KEY;
  if (!merchantCode || !terminal || !secretKey) return null;

  const env = process.env.REDSYS_ENVIRONMENT === "production" ? "production" : "test";
  return { merchantCode, terminal, secretKey, env };
}

export function isRedsysConfigured(): boolean {
  return getConfig() !== null;
}

/**
 * Cobra (operación MIT, "pago por referencia") el importe de una reserva
 * usando la tarjeta guardada como garantía (Booking.cardGuaranteeToken,
 * capturado como CIT al reservar en /reserva). La dispara tanto el botón
 * manual del admin como el cron de cobro automático — nunca se llama sola.
 *
 * Best-effort: guarda el resultado en la reserva y nunca lanza fuera de esta
 * función (mismo patrón que submitTravelerReport en ses.service.ts).
 */
export async function chargeGuaranteedCard(
  bookingId: string
): Promise<{ ok: boolean; message: string }> {
  if (!isRedsysConfigured()) {
    return {
      ok: false,
      message:
        "TPV Virtual no está configurado todavía (faltan REDSYS_MERCHANT_CODE/REDSYS_TERMINAL/REDSYS_SECRET_KEY).",
    };
  }

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) {
    return { ok: false, message: "Reserva no encontrada." };
  }
  if (booking.cardChargedAt) {
    return { ok: false, message: "Esta reserva ya se cobró." };
  }
  if (!booking.cardGuaranteeToken) {
    return { ok: false, message: "Esta reserva no tiene ninguna tarjeta de garantía guardada." };
  }

  // TODO: sustituir por la llamada REST real a Redsys en cuanto lleguen las
  // credenciales — operación de pago por referencia (MIT):
  //   DS_MERCHANT_IDENTIFIER = booking.cardGuaranteeToken
  //   DS_MERCHANT_COF_TXNID  = "N" (Merchant Initiated Transaction)
  //   DS_MERCHANT_AMOUNT     = booking.totalAmount (en céntimos)
  // Petición firmada con HMAC-SHA512 usando REDSYS_SECRET_KEY (ver manual
  // oficial REST de Redsys, ya verificado — README "TPV Virtual"). Si el
  // cobro sale bien, actualizar aquí mismo (mismo patrón que
  // markInvoiceAsPaid en invoice.service.ts):
  //   await prisma.booking.update({ where: { id: bookingId },
  //     data: { cardChargedAt: new Date(), cardChargeError: null, depositPaid: true } });
  //   return { ok: true, message: "Cobrado correctamente." };
  const message =
    "La conexión con Redsys todavía no está implementada — solo está lista la configuración alrededor.";
  await prisma.booking.update({
    where: { id: bookingId },
    data: { cardChargeError: message },
  });
  return { ok: false, message };
}

/**
 * Cobra automáticamente, como red de seguridad, las reservas cuya fecha de
 * entrada ya ha llegado (o pasado) y que nadie cobró a mano antes —
 * "el día de la reserva como muy tarde". Pensado para el cron diario, ver
 * app/api/cron/charge-guarantees/route.ts y vercel.json.
 */
export async function chargeDueGuarantees(): Promise<{
  bookingIds: string[];
  errors: { bookingId: string; message: string }[];
}> {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const due = await prisma.booking.findMany({
    where: {
      checkInDate: { lte: today },
      status: { in: [BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN] },
      cardChargedAt: null,
      cardGuaranteeToken: { not: null },
    },
    select: { id: true },
  });

  const bookingIds: string[] = [];
  const errors: { bookingId: string; message: string }[] = [];
  for (const { id } of due) {
    const result = await chargeGuaranteedCard(id);
    if (result.ok) bookingIds.push(id);
    else errors.push({ bookingId: id, message: result.message });
  }

  return { bookingIds, errors };
}
