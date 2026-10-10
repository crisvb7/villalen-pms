// app/api/mobile/auth/login/route.ts
// Login para la app móvil: mismas credenciales que /admin/login (tabla User,
// correo o nombre de usuario), pero devuelve un JWT en vez de fijar una
// cookie de sesión.

import { NextRequest, NextResponse } from "next/server";
import { verifyCredentials } from "@/lib/auth";
import { signMobileToken } from "@/lib/mobile-auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  // "email" es el campo que envían las versiones ya instaladas de la app;
  // admite igualmente un correo o un nombre de usuario.
  const identifier: string | undefined = body?.identifier ?? body?.email;
  const password: string | undefined = body?.password;

  if (!identifier || !password) {
    return NextResponse.json(
      { error: "Correo o usuario y contraseña son obligatorios." },
      { status: 400 }
    );
  }

  const user = await verifyCredentials(identifier, password);
  if (!user) {
    return NextResponse.json(
      { error: "Credenciales incorrectas." },
      { status: 401 }
    );
  }

  // El token y la app esperan un "email": si el usuario entra con nombre de
  // usuario, se usa ese nombre en su lugar.
  const login = user.email ?? user.username ?? "";
  const token = await signMobileToken({
    id: user.id,
    email: login,
    name: user.name,
  });

  return NextResponse.json({
    token,
    user: { id: user.id, email: login, name: user.name },
  });
}
