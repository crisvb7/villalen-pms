-- CreateEnum
CREATE TYPE "GuestSex" AS ENUM ('H', 'M');

-- AlterTable
ALTER TABLE "guests" ADD COLUMN     "secondLastName" TEXT,
ADD COLUMN     "sex" "GuestSex",
ADD COLUMN     "documentSupportNumber" TEXT,
ADD COLUMN     "addressStreet" TEXT,
ADD COLUMN     "addressCity" TEXT,
ADD COLUMN     "addressPostalCode" TEXT,
ADD COLUMN     "addressProvince" TEXT,
ADD COLUMN     "addressCountry" TEXT DEFAULT 'ES';
