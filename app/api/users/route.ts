// app/api/users/route.ts
// Gestión de usuarios del backoffice — solo SUPERADMIN.
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { requireSuperadmin } from "@/lib/auth";
import { createUser, listUsers, UserInputError } from "@/lib/services/user.service";

export async function GET() {
  const admin = await requireSuperadmin();
  if (!admin) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  try {
    return NextResponse.json({ data: await listUsers() });
  } catch (error) {
    console.error("[GET /api/users]", error);
    return NextResponse.json({ error: "Error al cargar los usuarios." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const admin = await requireSuperadmin();
  if (!admin) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  try {
    const user = await createUser({
      name: body?.name,
      login: body?.login,
      password: body?.password,
    });
    return NextResponse.json({ data: user }, { status: 201 });
  } catch (error) {
    if (error instanceof UserInputError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("[POST /api/users]", error);
    return NextResponse.json({ error: "Error al crear el usuario." }, { status: 500 });
  }
}
