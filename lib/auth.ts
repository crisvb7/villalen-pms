// lib/auth.ts
// Autenticación del backoffice (/admin). Un solo tipo de usuario por ahora
// (base para "multiusuario" más adelante), login con email + contraseña.

import { type AuthOptions, getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifyMobileToken } from "@/lib/mobile-auth";

export const authOptions: AuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/admin/login" },
  providers: [
    CredentialsProvider({
      name: "Credenciales",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });
        if (!user) return null;

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!isValid) return null;

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user) session.user.id = token.id as string;
      return session;
    },
  },
};

/**
 * Para usar en rutas de API: devuelve el usuario logueado o null.
 * Uso: `const user = await requireAuth(); if (!user) return 401;`
 *
 * Acepta dos formas de autenticación, para que las mismas rutas /api/*
 * sirvan a la web (cookie de NextAuth) y a la app móvil (JWT en el header
 * "Authorization: Bearer <token>", ver lib/mobile-auth.ts).
 */
export async function requireAuth() {
  const session = await getServerSession(authOptions);
  if (session?.user) return session.user;

  const authHeader = headers().get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return verifyMobileToken(authHeader.slice(7));
  }

  return null;
}
