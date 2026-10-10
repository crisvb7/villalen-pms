// app/api/users/[id]/route.ts
// Restablecer contraseña / eliminar una cuenta ADMIN — solo SUPERADMIN.
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { requireSuperadmin } from "@/lib/auth";
import { deleteUser, resetUserPassword, UserInputError } from "@/lib/services/user.service";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await requireSuperadmin();
  if (!admin) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  try {
    await resetUserPassword(params.id, body?.password);
    return NextResponse.json({ message: "Contraseña actualizada." });
  } catch (error) {
    if (error instanceof UserInputError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("[PATCH /api/users/:id]", error);
    return NextResponse.json({ error: "Error al cambiar la contraseña." }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await requireSuperadmin();
  if (!admin) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  try {
    await deleteUser(params.id);
    return NextResponse.json({ message: "Usuario eliminado." });
  } catch (error) {
    if (error instanceof UserInputError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("[DELETE /api/users/:id]", error);
    return NextResponse.json({ error: "Error al eliminar el usuario." }, { status: 500 });
  }
}
