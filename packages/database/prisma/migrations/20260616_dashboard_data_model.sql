-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CANCELLED', 'ENDED');

-- CreateEnum
CREATE TYPE "SalesChannel" AS ENUM ('ONLINE', 'POS', 'COMPLIMENTARY');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('PIX', 'CREDIT_CARD', 'DEBIT_CARD', 'BANK_TRANSFER');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'REFUNDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('LOW_STOCK', 'SLOW_SALES', 'FAST_SALES', 'CHECKIN_ISSUE', 'REFUND_SPIKE', 'MISSING_ASSET', 'FINANCIAL_ISSUE');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('CRITICAL', 'WARNING', 'INFO');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'SCHEDULED', 'PROCESSING', 'SETTLED', 'FAILED');

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "capacityTarget" INTEGER,
ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "status" "EventStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "venue" TEXT;

-- AlterTable: add new columns (eventId nullable first to allow backfill)
ALTER TABLE "Ticket"
  ADD COLUMN "channel"     "SalesChannel" NOT NULL DEFAULT 'ONLINE',
  ADD COLUMN "checkedInAt" TIMESTAMP(3),
  ADD COLUMN "refundedAt"  TIMESTAMP(3),
  ADD COLUMN "eventId"     TEXT;

-- Backfill Ticket.eventId from the parent TicketBatch
UPDATE "Ticket" t
SET "eventId" = (
  SELECT "eventId" FROM "TicketBatch" tb WHERE tb.id = t."batchId"
)
WHERE t."eventId" IS NULL;

-- Now enforce NOT NULL (all rows have a value after backfill)
ALTER TABLE "Ticket" ALTER COLUMN "eventId" SET NOT NULL;

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "status" "PaymentStatus" NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "installments" INTEGER NOT NULL DEFAULT 1,
    "provider" TEXT NOT NULL,
    "providerPaymentId" TEXT,
    "rawResponse" JSONB,
    "paidAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaleLog" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "paymentId" TEXT,
    "buyerName" TEXT NOT NULL,
    "buyerEmail" TEXT NOT NULL,
    "holderName" TEXT,
    "batchName" TEXT NOT NULL,
    "eventTitle" TEXT NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,
    "channel" "SalesChannel" NOT NULL,
    "method" "PaymentMethod",
    "status" "TicketStatus" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SaleLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailySalesSnapshot" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "revenue" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "ticketsSold" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailySalesSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventAlert" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "type" "AlertType" NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "message" TEXT NOT NULL,
    "suggestedAction" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payout" (
    "id" TEXT NOT NULL,
    "organizerId" TEXT NOT NULL,
    "eventId" TEXT,
    "amount" DECIMAL(65,30) NOT NULL,
    "status" "PayoutStatus" NOT NULL,
    "scheduledDate" TIMESTAMP(3),
    "settledAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_PaymentToTicket" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE INDEX "Payment_eventId_idx" ON "Payment"("eventId");

-- CreateIndex
CREATE INDEX "Payment_buyerId_idx" ON "Payment"("buyerId");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE INDEX "Payment_eventId_status_idx" ON "Payment"("eventId", "status");

-- CreateIndex
CREATE INDEX "Payment_createdAt_idx" ON "Payment"("createdAt");

-- CreateIndex
CREATE INDEX "SaleLog_eventId_occurredAt_idx" ON "SaleLog"("eventId", "occurredAt");

-- CreateIndex
CREATE INDEX "SaleLog_eventId_status_idx" ON "SaleLog"("eventId", "status");

-- CreateIndex
CREATE INDEX "SaleLog_occurredAt_idx" ON "SaleLog"("occurredAt");

-- CreateIndex
CREATE INDEX "DailySalesSnapshot_eventId_date_idx" ON "DailySalesSnapshot"("eventId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "DailySalesSnapshot_eventId_date_key" ON "DailySalesSnapshot"("eventId", "date");

-- CreateIndex
CREATE INDEX "EventAlert_eventId_resolvedAt_idx" ON "EventAlert"("eventId", "resolvedAt");

-- CreateIndex
CREATE INDEX "EventAlert_severity_idx" ON "EventAlert"("severity");

-- CreateIndex
CREATE INDEX "Payout_organizerId_status_idx" ON "Payout"("organizerId", "status");

-- CreateIndex
CREATE INDEX "Payout_eventId_idx" ON "Payout"("eventId");

-- CreateIndex
CREATE INDEX "Payout_scheduledDate_idx" ON "Payout"("scheduledDate");

-- CreateIndex
CREATE UNIQUE INDEX "_PaymentToTicket_AB_unique" ON "_PaymentToTicket"("A", "B");

-- CreateIndex
CREATE INDEX "_PaymentToTicket_B_index" ON "_PaymentToTicket"("B");

-- CreateIndex
CREATE INDEX "Event_organizerId_idx" ON "Event"("organizerId");

-- CreateIndex
CREATE INDEX "Event_date_idx" ON "Event"("date");

-- CreateIndex
CREATE INDEX "Event_status_idx" ON "Event"("status");

-- CreateIndex
CREATE INDEX "Ticket_eventId_idx" ON "Ticket"("eventId");

-- CreateIndex
CREATE INDEX "Ticket_eventId_status_idx" ON "Ticket"("eventId", "status");

-- CreateIndex
CREATE INDEX "Ticket_eventId_status_createdAt_idx" ON "Ticket"("eventId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Ticket_batchId_idx" ON "Ticket"("batchId");

-- CreateIndex
CREATE INDEX "Ticket_buyerId_idx" ON "Ticket"("buyerId");

-- CreateIndex
CREATE INDEX "Ticket_createdAt_idx" ON "Ticket"("createdAt");

-- CreateIndex
CREATE INDEX "Ticket_status_createdAt_idx" ON "Ticket"("status", "createdAt");

-- CreateIndex
CREATE INDEX "TicketBatch_eventId_idx" ON "TicketBatch"("eventId");

-- CreateIndex
CREATE INDEX "TicketBatch_eventId_isActive_idx" ON "TicketBatch"("eventId", "isActive");

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleLog" ADD CONSTRAINT "SaleLog_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleLog" ADD CONSTRAINT "SaleLog_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "TicketBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleLog" ADD CONSTRAINT "SaleLog_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailySalesSnapshot" ADD CONSTRAINT "DailySalesSnapshot_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventAlert" ADD CONSTRAINT "EventAlert_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PaymentToTicket" ADD CONSTRAINT "_PaymentToTicket_A_fkey" FOREIGN KEY ("A") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PaymentToTicket" ADD CONSTRAINT "_PaymentToTicket_B_fkey" FOREIGN KEY ("B") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

