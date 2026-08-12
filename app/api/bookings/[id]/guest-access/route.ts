// app/api/bookings/[id]/guest-access/route.ts
// Generación del código de acceso a la app de huéspedes, para el personal
// (desde /admin/reservas en la web, o desde la app de staff — misma ruta).
// POST genera/regenera y devuelve el código en claro UNA sola vez (a partir
// de aquí solo se guarda su hash); DELETE revoca el acceso.

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import {
  generateGuestAccessCode,
  revokeGuestAccessCode,
} from "@/lib/services/guest-access.service";

export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const { code, booking } = await generateGuestAccessCode(params.id);
    return NextResponse.json({ data: { code, bookingId: booking.id } });
  } catch (error) {
    console.error("[POST /api/bookings/:id/guest-access]", error);
    return NextResponse.json(
      { error: "No se pudo generar el código de acceso." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    await revokeGuestAccessCode(params.id);
    return NextResponse.json({ message: "Acceso revocado." });
  } catch (error) {
    console.error("[DELETE /api/bookings/:id/guest-access]", error);
    return NextResponse.json(
      { error: "No se pudo revocar el acceso." },
      { status: 500 }
    );
  }
}
