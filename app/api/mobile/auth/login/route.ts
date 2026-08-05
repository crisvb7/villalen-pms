// app/api/mobile/auth/login/route.ts
// Login para la app móvil: mismas credenciales que /admin/login (tabla User),
// pero devuelve un JWT en vez de fijar una cookie de sesión.

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signMobileToken } from "@/lib/mobile-auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const email = body?.email;
  const password = body?.password;

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email y contraseña son obligatorios." },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json(
      { error: "Credenciales incorrectas." },
      { status: 401 }
    );
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    return NextResponse.json(
      { error: "Credenciales incorrectas." },
      { status: 401 }
    );
  }

  const token = await signMobileToken({
    id: user.id,
    email: user.email,
    name: user.name,
  });

  return NextResponse.json({
    token,
    user: { id: user.id, email: user.email, name: user.name },
  });
}
