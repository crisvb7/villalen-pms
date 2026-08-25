-- AlterTable
ALTER TABLE "guests" ADD COLUMN     "addressMunicipalityCode" TEXT;

-- CreateTable
CREATE TABLE "booking_travelers" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "secondLastName" TEXT,
    "documentId" TEXT,
    "documentSupportNumber" TEXT,
    "nationality" TEXT DEFAULT 'ES',
    "birthDate" TIMESTAMP(3),
    "sex" "GuestSex",
    "addressStreet" TEXT,
    "addressCity" TEXT,
    "addressMunicipalityCode" TEXT,
    "addressPostalCode" TEXT,
    "addressProvince" TEXT,
    "addressCountry" TEXT DEFAULT 'ES',
    "phone" TEXT,
    "email" TEXT,
    "relationshipToLead" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "booking_travelers_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "booking_travelers" ADD CONSTRAINT "booking_travelers_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
