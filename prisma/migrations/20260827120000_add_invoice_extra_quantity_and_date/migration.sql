-- AlterTable
ALTER TABLE "invoice_extras" ADD COLUMN     "quantity" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "date" DATE;
