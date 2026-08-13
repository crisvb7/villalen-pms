// app/api/staff/push-token/route.ts
// Registra/retira el token de dispositivo (APNs) de la app de staff, para
// mandarle notificaciones push cuando un huésped pide algo. Un usuario
// puede tener varios dispositivos; el token en sí ya identifica el
// dispositivo (es único).

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const { token } = (await request.json()) as { token?: string };
    if (!token) {
      return NextResponse.json({ error: "Falta el token." }, { status: 400 });
    }

    await prisma.staffPushToken.upsert({
      where: { token },
      update: { userId: user.id },
      create: { token, userId: user.id },
    });

    return NextResponse.json({ message: "Token registrado." });
  } catch (error) {
    console.error("[POST /api/staff/push-token]", error);
    return NextResponse.json({ error: "No se pudo registrar el token." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const { token } = (await request.json()) as { token?: string };
    if (!token) {
      return NextResponse.json({ error: "Falta el token." }, { status: 400 });
    }
    await prisma.staffPushToken.deleteMany({ where: { token, userId: user.id } });
    return NextResponse.json({ message: "Token retirado." });
  } catch (error) {
    console.error("[DELETE /api/staff/push-token]", error);
    return NextResponse.json({ error: "No se pudo retirar el token." }, { status: 500 });
  }
}
