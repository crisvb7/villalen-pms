// app/api/bookings/[id]/resend-email/route.ts
// Reenvío manual del email de confirmación (botón "📧 Reenviar email" en el
// admin). A diferencia del envío automático, aquí sí queremos ver el error
// si Resend falla (p.ej. dominio no verificado).

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email/client";
import { BookingConfirmationEmail } from "@/lib/email/templates/BookingConfirmationEmail";
import { formatDateLong, formatCurrency } from "@/lib/utils";
import { requireAuth } from "@/lib/auth";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const booking = await prisma.booking.findUnique({
      where: { id: params.id },
      include: { guest: true, room: true },
    });
    if (!booking) {
      return NextResponse.json({ error: "Reserva no encontrada." }, { status: 404 });
    }

    await sendEmail(
      {
        to: booking.guest.email,
        subject:
          booking.status === "PENDING" ? "Hemos recibido tu solicitud de reserva" : "Tu reserva está confirmada",
        react: BookingConfirmationEmail({
          guestFirstName: booking.guest.firstName,
          roomName: booking.room.name,
          checkInDate: formatDateLong(booking.checkInDate),
          checkOutDate: formatDateLong(booking.checkOutDate),
          totalAmount: formatCurrency(booking.totalAmount.toString()),
          status: booking.status === "PENDING" ? "PENDING" : "CONFIRMED",
          precheckinUrl: `${process.env.NEXTAUTH_URL ?? ""}/precheckin/${booking.id}`,
          bankIban: process.env.HOTEL_BANK_IBAN,
        }),
      },
      { throwOnError: true }
    );

    return NextResponse.json({ message: `Email reenviado a ${booking.guest.email}.` });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Error al reenviar el email.";
    console.error("[POST /api/bookings/:id/resend-email]", error);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
