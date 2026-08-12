// lib/types.ts
// Reflejan los modelos de prisma/schema.prisma en el backend (villalen-pms).
// Los Decimal de Prisma llegan como string por JSON, de ahí el `string` en
// los importes.

export type RoomType = "DOUBLE" | "APARTMENT";

export type BookingStatus =
  | "PENDING"
  | "CONFIRMED"
  | "CANCELLED"
  | "CHECKED_IN"
  | "CHECKED_OUT";

export type BookingSource =
  | "WEB"
  | "BOOKING"
  | "AIRBNB"
  | "MANUAL"
  | "CHANNEX"
  | "PHONE";

export interface Room {
  id: string;
  name: string;
  description: string | null;
  capacity: number;
  basePrice: string;
  type: RoomType;
  isClean: boolean;
  amenities: string[];
  imageUrl: string | null;
}

export interface Guest {
  id: string;
  firstName: string;
  lastName: string;
  documentId: string;
  email: string;
  phone: string | null;
  nationality: string | null;
}

export interface Booking {
  id: string;
  guestId: string;
  roomId: string | null;
  roomType: RoomType;
  checkInDate: string;
  checkOutDate: string;
  totalAmount: string;
  status: BookingStatus;
  source: BookingSource;
  depositPaid: boolean;
  notes: string | null;
  adults: number;
  children: number;
  guest: Guest;
  room: Room | null;
  guestAccessCodeSetAt: string | null;
  guestDisplayName: string | null;
  guestAccessCodePlain: string | null;
}

export interface CleaningRoom {
  id: string;
  name: string;
  isClean: boolean;
  capacity: number;
  type: RoomType;
  bookings: {
    checkOutDate: string;
    guest: { firstName: string; lastName: string };
  }[];
}

export interface MobileUser {
  id: string;
  email: string;
  name: string;
}

// ── Caja ─────────────────────────────────────────────────────────────────

export type CashMovementType = "INCOME" | "EXPENSE";
export type CashSessionStatus = "OPEN" | "CLOSED";

export interface CashMovement {
  id: string;
  cashSessionId: string;
  type: CashMovementType;
  concept: string;
  amount: string;
  createdAt: string;
}

export interface CashSession {
  id: string;
  date: string;
  openingBalance: string;
  closingBalance: string | null;
  expectedBalance: string | null;
  difference: string | null;
  status: CashSessionStatus;
  notes: string | null;
  openedAt: string;
  closedAt: string | null;
  movements: CashMovement[];
}

// ── Gastos ───────────────────────────────────────────────────────────────

export type PaymentMethod = "CASH" | "CARD" | "TRANSFER" | "OTHER";

export interface Expense {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: string;
  paymentMethod: PaymentMethod;
  supplier: string | null;
  notes: string | null;
}

// ── Presupuestos ─────────────────────────────────────────────────────────

export type QuoteStatus = "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED" | "EXPIRED";

export interface Quote {
  id: string;
  quoteNumber: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string | null;
  roomName: string;
  pricePerNight: string;
  checkInDate: string;
  checkOutDate: string;
  subtotal: string;
  tax: string;
  total: string;
  status: QuoteStatus;
  validUntil: string;
  notes: string | null;
  convertedBookingId: string | null;
}

// ── Facturas ─────────────────────────────────────────────────────────────

export interface InvoiceExtra {
  id: string;
  description: string;
  amount: string;
}

export interface Invoice {
  id: string;
  bookingId: string;
  issueDate: string;
  total: string;
  tax: string;
  subtotal: string;
  invoiceNumber: string;
  isPaid: boolean;
  paymentMethod: PaymentMethod | null;
  booking: Booking;
  extras: InvoiceExtra[];
}

// ── Estadísticas ─────────────────────────────────────────────────────────

export interface YearStats {
  year: number;
  revenueByMonth: { month: number; value: number }[];
  expensesByMonth: { month: number; value: number }[];
  occupancyByMonth: { month: number; value: number }[];
  bookingsBySource: { source: string; count: number }[];
  roomPerformance: { roomName: string; bookings: number; revenue: number }[];
  totals: {
    revenue: number;
    expenses: number;
    net: number;
    averageOccupancy: number;
  };
  availableYears: number[];
}
