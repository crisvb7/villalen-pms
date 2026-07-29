// lib/services/cash.service.ts
// Capa de servicio para el Control de Caja (arqueo diario de efectivo).

import { prisma } from "@/lib/prisma";
import { CashMovementType, CashSessionStatus } from "@prisma/client";

export async function getOpenSession() {
  return prisma.cashSession.findFirst({
    where: { status: CashSessionStatus.OPEN },
    include: { movements: { orderBy: { createdAt: "desc" } } },
  });
}

export async function openCashSession(openingBalance: number, notes?: string) {
  const existing = await getOpenSession();
  if (existing) {
    throw new Error("Ya hay una caja abierta. Ciérrala antes de abrir otra.");
  }
  if (openingBalance < 0) throw new Error("El fondo inicial no puede ser negativo.");

  return prisma.cashSession.create({
    data: {
      date: new Date(),
      openingBalance,
      notes,
    },
  });
}

export interface AddMovementInput {
  type: CashMovementType;
  concept: string;
  amount: number;
}

export async function addCashMovement(sessionId: string, input: AddMovementInput) {
  const session = await prisma.cashSession.findUnique({ where: { id: sessionId } });
  if (!session) throw new Error("Turno de caja no encontrado.");
  if (session.status !== CashSessionStatus.OPEN) {
    throw new Error("Este turno de caja ya está cerrado.");
  }
  if (input.amount <= 0) throw new Error("El importe debe ser mayor que cero.");
  if (!input.concept.trim()) throw new Error("El concepto es obligatorio.");

  return prisma.cashMovement.create({
    data: {
      cashSessionId: sessionId,
      type: input.type,
      concept: input.concept.trim(),
      amount: input.amount,
    },
  });
}

export async function closeCashSession(sessionId: string, closingBalance: number) {
  const session = await prisma.cashSession.findUnique({
    where: { id: sessionId },
    include: { movements: true },
  });
  if (!session) throw new Error("Turno de caja no encontrado.");
  if (session.status !== CashSessionStatus.OPEN) {
    throw new Error("Este turno de caja ya está cerrado.");
  }
  if (closingBalance < 0) throw new Error("El efectivo contado no puede ser negativo.");

  const income = session.movements
    .filter((m) => m.type === CashMovementType.INCOME)
    .reduce((sum, m) => sum + parseFloat(m.amount.toString()), 0);
  const expense = session.movements
    .filter((m) => m.type === CashMovementType.EXPENSE)
    .reduce((sum, m) => sum + parseFloat(m.amount.toString()), 0);

  const expectedBalance = parseFloat(
    (parseFloat(session.openingBalance.toString()) + income - expense).toFixed(2)
  );
  const difference = parseFloat((closingBalance - expectedBalance).toFixed(2));

  return prisma.cashSession.update({
    where: { id: sessionId },
    data: {
      closingBalance,
      expectedBalance,
      difference,
      status: CashSessionStatus.CLOSED,
      closedAt: new Date(),
    },
  });
}

export async function getAllSessions() {
  return prisma.cashSession.findMany({
    include: { movements: true },
    orderBy: { openedAt: "desc" },
  });
}
