// app/api/bookings/[id]/precheckin/route.ts
// Endpoint PÚBLICO (sin requireAuth): el huésped no tiene sesión. El id de
// reserva (cuid) hace de "capacidad de acceso" — mismo nivel de exposición
// que ya tenía GET /api/bookings/:id/ficha-viajero. Solo permite leer/escribir
// los datos que el propio huésped aportó al reservar, nada de otras reservas.

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { getBookingForPrecheckin, submitPrecheckin } from "@/lib/services/precheckin.service";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const booking = await getBookingForPrecheckin(params.id);
    if (!booking) {
      return NextResponse.json({ error: "Reserva no encontrada." }, { status: 404 });
    }
    return NextResponse.json({ data: booking });
  } catch (error) {
    console.error("[GET /api/bookings/:id/precheckin]", error);
    return NextResponse.json({ error: "Error al obtener la reserva." }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    if (!body.firstName || !body.lastName || !body.documentId) {
      return NextResponse.json(
        { error: "Nombre, apellidos y documento son obligatorios." },
        { status: 400 }
      );
    }

    const booking = await submitPrecheckin(params.id, {
      firstName: body.firstName,
      lastName: body.lastName,
      secondLastName: body.secondLastName,
      documentId: body.documentId,
      documentSupportNumber: body.documentSupportNumber,
      phone: body.phone,
      nationality: body.nationality,
      birthDate: body.birthDate,
      sex: body.sex,
      addressStreet: body.addressStreet,
      addressCity: body.addressCity,
      addressMunicipalityCode: body.addressMunicipalityCode,
      addressPostalCode: body.addressPostalCode,
      addressProvince: body.addressProvince,
      addressCountry: body.addressCountry,
    });

    return NextResponse.json({ data: booking });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Error al guardar el precheckin.";
    console.error("[PATCH /api/bookings/:id/precheckin]", error);
    return NextResponse.json({ error: msg }, { status: 422 });
  }
}
