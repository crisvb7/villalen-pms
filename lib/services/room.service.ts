// lib/services/room.service.ts
// Capa de servicio para la gestión de Habitaciones

import { prisma } from "@/lib/prisma";
import { parseISO, isValid, addDays } from "date-fns";
import { pushAvailabilityAndRates } from "@/lib/services/channex.service";
import { checkRoomTypeAvailability } from "@/lib/services/booking.service";
import { RoomType } from "@prisma/client";

export interface CreateRoomData {
  name: string;
  description?: string;
  capacity: number;
  basePrice: number;
  type?: RoomType;
  amenities?: string[];
  imageUrl?: string;
}

export interface UpdateRoomData extends Partial<CreateRoomData> {
  isClean?: boolean;
  channexRoomTypeId?: string;
  channexRatePlanId?: string;
}

const CHANNEX_SYNC_WINDOW_DAYS = 365;

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
      type: data.type ?? RoomType.DOUBLE,
      amenities: data.amenities ?? [],
      imageUrl: data.imageUrl,
    },
  });
}

export async function updateRoom(id: string, data: UpdateRoomData) {
  const room = await prisma.room.update({
    where: { id },
    data,
  });

  // Si cambia el precio o se acaba de mapear la habitación a un canal,
  // republicar la ventana completa para que Channex refleje la tarifa actual.
  if (data.basePrice !== undefined || data.channexRoomTypeId || data.channexRatePlanId) {
    const today = new Date();
    await pushAvailabilityAndRates(id, today, addDays(today, CHANNEX_SYNC_WINDOW_DAYS));
  }

  return room;
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

// ── Disponibilidad por tipo (motor de reservas público) ───────────────────

export async function getAvailableRoomTypes(
  checkInDate: string,
  checkOutDate: string,
  minCapacity = 1
): Promise<{ type: RoomType; available: boolean; price: number; capacity: number }[]> {
  const ci = parseISO(checkInDate);
  const co = parseISO(checkOutDate);

  if (!isValid(ci) || !isValid(co) || ci >= co) {
    throw new Error("Rango de fechas inválido.");
  }

  const rooms = await prisma.room.findMany({
    where: { capacity: { gte: minCapacity } },
    orderBy: { basePrice: "asc" },
  });

  const types = Array.from(new Set(rooms.map((r) => r.type)));

  const results = await Promise.all(
    types.map(async (type) => {
      const cheapest = rooms.find((r) => r.type === type)!; // rooms ya viene ordenado por basePrice asc
      const available = await checkRoomTypeAvailability(type, ci, co);
      return {
        type,
        available,
        price: parseFloat(cheapest.basePrice.toString()),
        capacity: cheapest.capacity,
      };
    })
  );

  return results.filter((r) => r.available);
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
      type: true,
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
