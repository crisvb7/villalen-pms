-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPERADMIN', 'ADMIN');

-- AlterTable: el correo pasa a ser opcional (se puede entrar con usuario),
-- y se añaden el nombre de usuario y el rol.
ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL,
ADD COLUMN     "username" TEXT,
ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'ADMIN';

-- Las cuentas que ya existían tenían acceso completo: pasan a SUPERADMIN
-- para no perder ningún permiso (incluida la nueva gestión de usuarios).
UPDATE "users" SET "role" = 'SUPERADMIN';

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
