// app/api/expenses/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { deleteExpense } from "@/lib/services/expense.service";
import { requireAuth } from "@/lib/auth";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    await deleteExpense(params.id);
    return NextResponse.json({ message: "Gasto eliminado correctamente." });
  } catch (error) {
    console.error("[DELETE /api/expenses/:id]", error);
    return NextResponse.json({ error: "Error al eliminar el gasto." }, { status: 500 });
  }
}
