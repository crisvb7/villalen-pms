// app/api/mobile/auth/me/route.ts
// Comprueba si el token guardado en la app sigue siendo válido y devuelve el
// usuario. La app lo llama al arrancar para decidir si mostrar login o home.

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  return NextResponse.json({ user });
}
