// lib/types.ts
// Tipos que reflejan la forma exacta de las respuestas de /api/guest-app/*
// (ver lib/services/guest-*.service.ts y app/api/guest-app/* en el backend).

export type GuestServiceType = "BREAKFAST" | "DINNER" | "CLEANING";
export type GuestServiceStatus = "REQUESTED" | "CANCELLED";
export type MessageSender = "GUEST" | "STAFF";

export interface GuestBooking {
  id: string;
  roomName: string;
  checkInDate: string; // ISO date
  checkOutDate: string; // ISO date
  adults: number;
  children: number;
  guestDisplayName: string | null;
  needsName: boolean;
}

export interface GuestServiceRequest {
  id: string;
  bookingId: string;
  date: string; // ISO date
  type: GuestServiceType;
  status: GuestServiceStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GuestMessage {
  id: string;
  bookingId: string;
  sender: MessageSender;
  body: string;
  readAt: string | null;
  createdAt: string;
}

export type RouteDifficulty = "EASY" | "MODERATE" | "HARD";

export interface GuestRoute {
  id: string;
  name: string;
  category: string;
  isCaminoStage: boolean;
  distanceKm: string; // Decimal de Prisma → string en JSON, parsear con parseFloat
  distanceFromHotelKm: string | null; // en coche, para ordenar por cercanía
  durationMin: number;
  elevationGainM: number;
  elevationLossM: number;
  difficulty: RouteDifficulty;
  icon: string; // nombre de Ionicons, validado en el backend — ver lib/route-display.ts para el fallback defensivo
  imageUrl: string | null; // si existe, sustituye al icono como cabecera (ver rutas/[id].tsx)
  description: string;
  pointsOfInterest: string[];
  isPublished: boolean;
  order: number;
}
