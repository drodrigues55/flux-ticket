-- AlterEnum
ALTER TYPE "TicketStatus" ADD VALUE 'CONSUMED';

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "hmacSignature" TEXT;
