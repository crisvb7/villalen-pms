// lib/types.ts
// Tipos e interfaces centrales de la aplicación
// =============================================
// AVISO PCI-DSS: Ningún tipo en este archivo contiene campos para
// datos de tarjetas de crédito (PAN, caducidad, CVC/CVV).

import { BookingStatus, BookingSource } from "@prisma/client";

// ── Re-export de enumeraciones de Prisma ──────────────────────────────────
export { BookingStatus, BookingSource };

// ── Tipos de dominio ──────────────────────────────────────────────────────

export interface RoomDTO {
  id: string;
  name: string;
  description: string | null;
  capacity: number;
  basePrice: number;
  isClean: boolean;
  amenities: string[];
  imageUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface GuestDTO {
  id: string;
  firstName: string;
  lastName: string;
  documentId: string;
  email: string;
  phone: string | null;
  nationality: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface BookingDTO {
  id: string;
  guestId: string;
  roomId: string;
  checkInDate: Date;
  checkOutDate: Date;
  totalAmount: number;
  status: BookingStatus;
  source: BookingSource;
  depositPaid: boolean;
  notes: string | null;
  adults: number;
  children: number;
  externalId: string | null;
  channelRef: string | null;
  createdAt: Date;
  updatedAt: Date;
  guest?: GuestDTO;
  room?: RoomDTO;
}

export interface InvoiceDTO {
  id: string;
  bookingId: string;
  issueDate: Date;
  total: number;
  tax: number;
  subtotal: number;
  pdfUrl: string | null;
  invoiceNumber: string;
  isPaid: boolean;
}

// ── Tipos de Request/Response ─────────────────────────────────────────────

export interface CreateBookingInput {
  roomId: string;
  checkInDate: string; // ISO string
  checkOutDate: string; // ISO string
  adults: number;
  children?: number;
  notes?: string;
  source?: BookingSource;
  // Datos del huésped (nuevo o existente)
  guest: {
    firstName: string;
    lastName: string;
    documentId: string;
    email: string;
    phone?: string;
    nationality?: string;
  };
}

export interface AvailabilitySearchInput {
  checkInDate: string;
  checkOutDate: string;
  guests?: number;
}

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
}

// ── Payload del Channel Manager (Channex) ─────────────────────────────────
// Estructura simplificada del webhook de Channex.io
export interface ChannexWebhookPayload {
  event: string; // e.g., "booking_created", "booking_updated", "booking_cancelled"
  booking: {
    id: string;
    property_id: string;
    status: string;
    channel: {
      title: string; // "Booking.com", "Airbnb", etc.
    };
    arrival_date: string; // "YYYY-MM-DD"
    departure_date: string; // "YYYY-MM-DD"
    rooms: Array<{
      id: string;
      title: string;
      occupancy: {
        adults: number;
        children: number;
      };
      rate: {
        price: number;
        currency: string;
      };
    }>;
    guest: {
      first_name: string;
      last_name: string;
      email: string;
      phone?: string;
      document?: string;
    };
    notes?: string;
  };
}

// ── Estructura de la Ficha de Viajero ─────────────────────────────────────
export interface TravelerRecord {
  bookingId: string;
  checkInDate: string;
  checkOutDate: string;
  roomName: string;
  guest: {
    firstName: string;
    lastName: string;
    documentId: string;
    documentType: "DNI" | "PASAPORTE" | "NIE";
    nationality: string;
    birthDate?: string;
    phone?: string;
    email: string;
  };
  establishment: {
    name: string;
    address: string;
    cif: string;
    municipality: string;
    province: string;
  };
}
