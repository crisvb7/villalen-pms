// scripts/create-admin.ts
// Crea (o actualiza la contraseña de) un usuario del backoffice.
// Uso: ADMIN_EMAIL=... ADMIN_PASSWORD=... ADMIN_NAME=... npm run create-admin
// Seguro de ejecutar en producción: no toca habitaciones, reservas ni huéspedes.

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME ?? "Administrador";

  if (!email || !password) {
    console.error("❌ Faltan ADMIN_EMAIL y/o ADMIN_PASSWORD en el entorno.");
    console.error(
      "   Uso: ADMIN_EMAIL=tu@email.com ADMIN_PASSWORD=contraseña npm run create-admin"
    );
    process.exit(1);
  }

  if (password.length < 8) {
    console.error("❌ La contraseña debe tener al menos 8 caracteres.");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  // Crea (o restablece) siempre un SUPERADMIN: es la vía para recuperar el
  // acceso total si hiciera falta. Los usuarios normales se crean desde
  // /admin/usuarios.
  const user = await prisma.user.upsert({
    where: { email: email.toLowerCase() },
    update: { passwordHash, name, role: "SUPERADMIN" },
    create: { email: email.toLowerCase(), passwordHash, name, role: "SUPERADMIN" },
  });

  console.log(`✅ Superadministrador "${user.email}" listo para iniciar sesión en /admin/login.`);
}

main()
  .catch((error) => {
    console.error("❌ Error al crear el usuario:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
