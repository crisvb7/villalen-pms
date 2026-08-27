-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "cardGuaranteeToken" TEXT,
ADD COLUMN     "cardChargedAt" TIMESTAMP(3),
ADD COLUMN     "cardChargeError" TEXT;
