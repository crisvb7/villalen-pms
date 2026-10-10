// types/next-auth.d.ts
// Añade el id y el rol de usuario a los tipos de sesión/JWT de NextAuth.

import "next-auth";
import "next-auth/jwt";
import type { UserRole } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      role?: UserRole;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role?: UserRole;
  }
}
