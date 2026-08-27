-- AlterTable
ALTER TABLE "guest_messages" ADD COLUMN     "replyToId" TEXT;

-- AddForeignKey
ALTER TABLE "guest_messages" ADD CONSTRAINT "guest_messages_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "guest_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
