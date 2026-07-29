// lib/services/expense.service.ts
// Capa de servicio para el libro de Gastos.

import { prisma } from "@/lib/prisma";
import { PaymentMethod } from "@prisma/client";
import { parseISO } from "date-fns";

export interface CreateExpenseInput {
  date: string; // ISO
  category: string;
  description: string;
  amount: number;
  paymentMethod?: PaymentMethod;
  supplier?: string;
  notes?: string;
}

export async function createExpense(input: CreateExpenseInput) {
  const date = parseISO(input.date);
  if (isNaN(date.getTime())) throw new Error("Fecha inválida.");
  if (!input.category.trim()) throw new Error("La categoría es obligatoria.");
  if (input.amount <= 0) throw new Error("El importe debe ser mayor que cero.");

  return prisma.expense.create({
    data: {
      date,
      category: input.category.trim(),
      description: input.description,
      amount: input.amount,
      paymentMethod: input.paymentMethod ?? PaymentMethod.OTHER,
      supplier: input.supplier,
      notes: input.notes,
    },
  });
}

export interface ExpenseFilters {
  from?: Date;
  to?: Date;
  category?: string;
}

export async function getAllExpenses(filters?: ExpenseFilters) {
  return prisma.expense.findMany({
    where: {
      date:
        filters?.from || filters?.to
          ? { gte: filters?.from, lte: filters?.to }
          : undefined,
      category: filters?.category ? { equals: filters.category } : undefined,
    },
    orderBy: { date: "desc" },
  });
}

export async function deleteExpense(id: string) {
  return prisma.expense.delete({ where: { id } });
}

export async function getExpensesSummary(filters?: ExpenseFilters) {
  const expenses = await getAllExpenses(filters);
  const total = expenses.reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0);
  return { count: expenses.length, total: parseFloat(total.toFixed(2)) };
}
