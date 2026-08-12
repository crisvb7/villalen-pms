// lib/guest-auth.ts
// Autenticación de la app de huéspedes. No hay registro: el personal genera
// un código de acceso por reserva (ver lib/services/guest-access.service.ts)
// y el huésped lo canjea por un JWT en /api/guest-app/auth/login, que la app
// guarda y manda como "Authorization: Bearer <token>" en cada request —
// mismo patrón que lib/mobile-auth.ts para la app de staff, pero en un
// namespace y secreto propios porque aquí NO hay cuenta de personal detrás.

import { SignJWT, jwtVerify } from "jose";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import type { Booking } from "@prisma/client";

const GUEST_TOKEN_TTL = "45d";

function getSecret() {
  const secret = process.env.GUEST_JWT_SECRET;
  if (!secret) {
    throw new Error("Falta la variable de entorno GUEST_JWT_SECRET.");
  }
  return new TextEncoder().encode(secret);
}

type GuestTokenPayload = {
  bookingId: string;
  codeSetAt: string; // ISO — instantánea de Booking.guestAccessCodeSetAt en el momento del login
};

export async function signGuestToken(bookingId: string, codeSetAt: Date) {
  return new SignJWT({ codeSetAt: codeSetAt.toISOString() })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(bookingId)
    .setIssuedAt()
    .setExpirationTime(GUEST_TOKEN_TTL)
    .sign(getSecret());
}

async function verifyGuestToken(token: string): Promise<GuestTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (!payload.sub || typeof payload.codeSetAt !== "string") return null;
    return { bookingId: payload.sub, codeSetAt: payload.codeSetAt };
  } catch {
    return null;
  }
}

/**
 * Para usar en las rutas /api/guest-app/*: valida el Bearer token y además
 * comprueba que el código de acceso no se haya regenerado desde que se
 * emitió. Así, cuando el personal genera un código nuevo para una
 * habitación (nueva estancia), las sesiones del huésped anterior quedan
 * invalidadas al instante aunque su JWT todavía no haya caducado.
 *
 * Devuelve la reserva completa (evita una segunda consulta en cada ruta).
 */
export async function requireGuestAuth(): Promise<Booking | null> {
  const authHeader = headers().get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const payload = await verifyGuestToken(authHeader.slice(7));
  if (!payload) return null;

  const booking = await prisma.booking.findUnique({ where: { id: payload.bookingId } });
  if (!booking?.guestAccessCodeSetAt) return null;
  if (booking.guestAccessCodeSetAt.toISOString() !== payload.codeSetAt) return null;

  return booking;
}
