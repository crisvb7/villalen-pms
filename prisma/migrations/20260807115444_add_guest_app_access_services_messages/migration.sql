-- CreateEnum
CREATE TYPE "GuestServiceType" AS ENUM ('BREAKFAST', 'DINNER', 'CLEANING');

-- CreateEnum
CREATE TYPE "GuestServiceStatus" AS ENUM ('REQUESTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MessageSender" AS ENUM ('GUEST', 'STAFF');

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "guestAccessCodeHash" TEXT,
ADD COLUMN     "guestAccessCodeSetAt" TIMESTAMP(3),
ADD COLUMN     "guestDisplayName" TEXT,
ADD COLUMN     "guestLastLoginAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "guest_service_requests" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "type" "GuestServiceType" NOT NULL,
    "status" "GuestServiceStatus" NOT NULL DEFAULT 'REQUESTED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guest_service_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guest_messages" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "sender" "MessageSender" NOT NULL,
    "body" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guest_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "guest_service_requests_bookingId_date_type_key" ON "guest_service_requests"("bookingId", "date", "type");

-- CreateIndex
CREATE INDEX "guest_messages_bookingId_createdAt_idx" ON "guest_messages"("bookingId", "createdAt");

-- AddForeignKey
ALTER TABLE "guest_service_requests" ADD CONSTRAINT "guest_service_requests_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_messages" ADD CONSTRAINT "guest_messages_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

