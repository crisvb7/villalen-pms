// lib/mobile-auth.ts
// Autenticación para la app móvil (Expo/React Native), que no puede usar las
// cookies httpOnly de NextAuth. El flujo es: login por email+contraseña en
// /api/mobile/auth/login → JWT firmado con MOBILE_JWT_SECRET → la app lo
// guarda en SecureStore y lo manda como "Authorization: Bearer <token>" en
// cada request. requireAuth() (lib/auth.ts) acepta ese header como
// alternativa a la sesión de NextAuth, así que las rutas /api/* existentes
// no necesitan cambios: sirven tanto a la web como al móvil.

import { SignJWT, jwtVerify } from "jose";

const MOBILE_TOKEN_TTL = "30d";

function getSecret() {
  const secret = process.env.MOBILE_JWT_SECRET;
  if (!secret) {
    throw new Error("Falta la variable de entorno MOBILE_JWT_SECRET.");
  }
  return new TextEncoder().encode(secret);
}

export type MobileTokenUser = {
  id: string;
  email: string;
  name: string;
};

export async function signMobileToken(user: MobileTokenUser) {
  return new SignJWT({ email: user.email, name: user.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(MOBILE_TOKEN_TTL)
    .sign(getSecret());
}

export async function verifyMobileToken(
  token: string
): Promise<MobileTokenUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (!payload.sub || typeof payload.email !== "string") return null;
    return {
      id: payload.sub,
      email: payload.email,
      name: typeof payload.name === "string" ? payload.name : "",
    };
  } catch {
    return null;
  }
}
