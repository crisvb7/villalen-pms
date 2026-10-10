// lib/services/user.service.ts
// Gestión de usuarios del backoffice (solo SUPERADMIN, ver /admin/usuarios).
// Las cuentas nuevas se crean siempre como ADMIN: acceso completo a todo
// menos a esta gestión de usuarios.

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const MIN_PASSWORD_LENGTH = 8;

const USERNAME_PATTERN = /^[a-z0-9._-]{3,32}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Error de validación con un mensaje apto para mostrar al usuario. */
export class UserInputError extends Error {}

const publicFields = {
  id: true,
  name: true,
  email: true,
  username: true,
  role: true,
  createdAt: true,
} as const;

export function listUsers() {
  return prisma.user.findMany({
    select: publicFields,
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
  });
}

export async function createUser(input: {
  name?: string;
  login?: string;
  password?: string;
}) {
  const name = input.name?.trim();
  const login = input.login?.trim().toLowerCase();
  const password = input.password ?? "";

  if (!name) throw new UserInputError("El nombre es obligatorio.");
  if (!login) throw new UserInputError("Indica un correo o un nombre de usuario.");

  // Si lleva "@" se trata como correo; si no, como nombre de usuario.
  const isEmail = login.includes("@");
  if (isEmail && !EMAIL_PATTERN.test(login)) {
    throw new UserInputError("El correo no es válido.");
  }
  if (!isEmail && !USERNAME_PATTERN.test(login)) {
    throw new UserInputError(
      "El usuario debe tener entre 3 y 32 caracteres: letras sin tildes, números, punto, guion o guion bajo."
    );
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new UserInputError(
      `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`
    );
  }

  // Un mismo texto no puede servir para entrar en dos cuentas, ni como
  // correo de una y usuario de otra.
  const taken = await prisma.user.findFirst({
    where: {
      OR: [
        { email: { equals: login, mode: "insensitive" } },
        { username: { equals: login, mode: "insensitive" } },
      ],
    },
    select: { id: true },
  });
  if (taken) throw new UserInputError("Ya existe una cuenta con ese correo o usuario.");

  return prisma.user.create({
    data: {
      name,
      email: isEmail ? login : null,
      username: isEmail ? null : login,
      passwordHash: await bcrypt.hash(password, 10),
      role: "ADMIN",
    },
    select: publicFields,
  });
}

export async function resetUserPassword(id: string, password?: string) {
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    throw new UserInputError(
      `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`
    );
  }
  await assertManageable(id);
  await prisma.user.update({
    where: { id },
    data: { passwordHash: await bcrypt.hash(password, 10) },
  });
}

export async function deleteUser(id: string) {
  await assertManageable(id);
  await prisma.user.delete({ where: { id } });
}

// Desde la web solo se gestionan las cuentas ADMIN: un SUPERADMIN (tú) no se
// puede borrar ni cambiar de contraseña aquí, para no quedarse sin acceso.
// Para eso sigue existiendo `npm run create-admin`.
async function assertManageable(id: string) {
  const user = await prisma.user.findUnique({ where: { id }, select: { role: true } });
  if (!user) throw new UserInputError("El usuario no existe.");
  if (user.role === "SUPERADMIN") {
    throw new UserInputError("Las cuentas de superadministrador no se gestionan desde aquí.");
  }
}
