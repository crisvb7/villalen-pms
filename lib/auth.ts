// lib/auth.ts
// Autenticación del backoffice (/admin). Login con correo O nombre de usuario
// + contraseña. Dos roles (ver UserRole en schema.prisma): SUPERADMIN, que
// además gestiona usuarios, y ADMIN, con acceso completo a todo lo demás.

import { type AuthOptions, getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import type { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { verifyMobileToken } from "@/lib/mobile-auth";

/**
 * Busca un usuario por correo o nombre de usuario (sin distinguir mayúsculas)
 * y comprueba la contraseña. Lo usan el login web y el de la app móvil.
 */
export async function verifyCredentials(identifier: string, password: string) {
  const login = identifier.trim();
  if (!login || !password) return null;

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: { equals: login, mode: "insensitive" } },
        { username: { equals: login, mode: "insensitive" } },
      ],
    },
  });
  if (!user) return null;

  const isValid = await bcrypt.compare(password, user.passwordHash);
  return isValid ? user : null;
}

export const authOptions: AuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/admin/login" },
  providers: [
    CredentialsProvider({
      name: "Credenciales",
      credentials: {
        // "email" por compatibilidad: admite correo o nombre de usuario.
        email: { label: "Correo o usuario", type: "text" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;

        const user = await verifyCredentials(credentials.email, credentials.password);
        if (!user) return null;

        return {
          id: user.id,
          email: user.email ?? user.username,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: UserRole }).role;
      } else if (!token.role && token.id) {
        // Sesiones iniciadas antes de existir los roles: se completa una vez.
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id },
          select: { role: true },
        });
        token.role = dbUser?.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role;
      }
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
  let authUser: { id: string; name?: string | null; email?: string | null } | null =
    session?.user ?? null;

  if (!authUser) {
    const authHeader = headers().get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      authUser = await verifyMobileToken(authHeader.slice(7));
    }
  }
  if (!authUser?.id) return null;

  // Las sesiones (web y móvil) son tokens firmados que duran semanas: se
  // comprueba que la cuenta siga existiendo para que eliminar a un usuario
  // desde /admin/usuarios le corte el acceso al momento.
  const exists = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { id: true },
  });
  return exists ? authUser : null;
}

/**
 * Como requireAuth(), pero solo deja pasar a un SUPERADMIN. El rol se lee
 * siempre de la base de datos (no del token), para que un cambio de rol o un
 * usuario borrado surta efecto al momento.
 */
export async function requireSuperadmin() {
  const authUser = await requireAuth();
  if (!authUser?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { id: true, role: true },
  });
  return user?.role === "SUPERADMIN" ? user : null;
}
