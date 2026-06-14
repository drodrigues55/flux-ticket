-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "meiaEntrada" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "TicketBatch" ADD COLUMN     "meiaEntrada" BOOLEAN NOT NULL DEFAULT false;
