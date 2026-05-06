// lib/services/room.service.ts
// Capa de servicio para la gestión de Habitaciones

import { prisma } from "@/lib/prisma";
import { parseISO, isValid } from "date-fns";

export interface CreateRoomData {
  name: string;
  description?: string;
  capacity: number;
  basePrice: number;
  amenities?: string[];
  imageUrl?: string;
}

export interface UpdateRoomData extends Partial<CreateRoomData> {
  isClean?: boolean;
}

// ── CRUD Habitaciones ─────────────────────────────────────────────────────

export async function getAllRooms() {
  return prisma.room.findMany({
    orderBy: { name: "asc" },
  });
}

export async function getRoomById(id: string) {
  return prisma.room.findUnique({
    where: { id },
    include: {
      bookings: {
        where: {
          status: { in: ["PENDING", "CONFIRMED", "CHECKED_IN"] },
          checkOutDate: { gte: new Date() },
        },
        orderBy: { checkInDate: "asc" },
        take: 5,
        include: { guest: true },
      },
    },
  });
}

export async function createRoom(data: CreateRoomData) {
  return prisma.room.create({
    data: {
      name: data.name,
      description: data.description,
      capacity: data.capacity,
      basePrice: data.basePrice,
      amenities: data.amenities ?? [],
      imageUrl: data.imageUrl,
    },
  });
}

export async function updateRoom(id: string, data: UpdateRoomData) {
  return prisma.room.update({
    where: { id },
    data,
  });
}

export async function deleteRoom(id: string) {
  // Verificar que no tiene reservas activas
  const activeBookings = await prisma.booking.count({
    where: {
      roomId: id,
      status: { in: ["PENDING", "CONFIRMED", "CHECKED_IN"] },
    },
  });

  if (activeBookings > 0) {
    throw new Error(
      `No se puede eliminar la habitación: tiene ${activeBookings} reserva(s) activa(s).`
    );
  }

  return prisma.room.delete({ where: { id } });
}

// ── Disponibilidad ────────────────────────────────────────────────────────

export async function getAvailableRooms(
  checkInDate: string,
  checkOutDate: string,
  minCapacity = 1
) {
  const ci = parseISO(checkInDate);
  const co = parseISO(checkOutDate);

  if (!isValid(ci) || !isValid(co) || ci >= co) {
    throw new Error("Rango de fechas inválido.");
  }

  // Habitaciones con reservas que solapan el período solicitado
  const roomsWithConflicts = await prisma.booking.findMany({
    where: {
      status: { in: ["PENDING", "CONFIRMED", "CHECKED_IN"] },
      AND: [
        { checkInDate: { lt: co } },
        { checkOutDate: { gt: ci } },
      ],
    },
    select: { roomId: true },
  });

  const conflictingRoomIds = roomsWithConflicts.map((b) => b.roomId);

  return prisma.room.findMany({
    where: {
      id: { notIn: conflictingRoomIds },
      capacity: { gte: minCapacity },
    },
    orderBy: { basePrice: "asc" },
  });
}

// ── Estado de limpieza ────────────────────────────────────────────────────

export async function updateCleaningStatus(id: string, isClean: boolean) {
  return prisma.room.update({
    where: { id },
    data: { isClean },
  });
}

export async function getCleaningStatus() {
  return prisma.room.findMany({
    select: {
      id: true,
      name: true,
      isClean: true,
      capacity: true,
      bookings: {
        where: {
          status: { in: ["CHECKED_IN"] },
        },
        select: {
          checkOutDate: true,
          guest: {
            select: { firstName: true, lastName: true },
          },
        },
        take: 1,
      },
    },
    orderBy: { name: "asc" },
  });
}
