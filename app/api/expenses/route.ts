// app/api/expenses/route.ts
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { createExpense, getAllExpenses } from "@/lib/services/expense.service";
import { requireAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const category = searchParams.get("category");

    const expenses = await getAllExpenses({
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      category: category ?? undefined,
    });

    return NextResponse.json({ data: expenses });
  } catch (error) {
    console.error("[GET /api/expenses]", error);
    return NextResponse.json({ error: "Error al obtener gastos." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const body = await request.json();

    if (!body.date || !body.category || !body.description || !body.amount) {
      return NextResponse.json(
        { error: "Faltan campos obligatorios: fecha, categoría, descripción, importe." },
        { status: 400 }
      );
    }

    const expense = await createExpense({
      date: body.date,
      category: body.category,
      description: body.description,
      amount: Number(body.amount),
      paymentMethod: body.paymentMethod,
      supplier: body.supplier,
      notes: body.notes,
    });

    return NextResponse.json({ data: expense }, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Error al crear el gasto.";
    console.error("[POST /api/expenses]", error);
    return NextResponse.json({ error: msg }, { status: 422 });
  }
}
