ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'EXPIRED';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'FAILED';

ALTER TYPE "ReservationStatus" ADD VALUE IF NOT EXISTS 'ABANDONED';

ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'EXPIRED';

DO $$ BEGIN
  CREATE TYPE "WaitlistStatus" AS ENUM ('WAITING', 'INVITED', 'RESERVED', 'EXPIRED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "providerStatus" TEXT;

CREATE TABLE IF NOT EXISTS "WaitlistEntry" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "batchId" TEXT NOT NULL,
  "buyerId" TEXT,
  "reservationId" TEXT,
  "email" TEXT NOT NULL,
  "name" TEXT,
  "phone" TEXT,
  "status" "WaitlistStatus" NOT NULL DEFAULT 'WAITING',
  "position" INTEGER NOT NULL,
  "expiresAt" TIMESTAMP(3),
  "invitedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WaitlistEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Payment_provider_providerPaymentId_idx" ON "Payment"("provider", "providerPaymentId");
CREATE INDEX IF NOT EXISTS "Payment_providerEventId_idx" ON "Payment"("providerEventId");

CREATE INDEX IF NOT EXISTS "WaitlistEntry_eventId_idx" ON "WaitlistEntry"("eventId");
CREATE INDEX IF NOT EXISTS "WaitlistEntry_batchId_status_position_idx" ON "WaitlistEntry"("batchId", "status", "position");
CREATE INDEX IF NOT EXISTS "WaitlistEntry_email_idx" ON "WaitlistEntry"("email");
CREATE INDEX IF NOT EXISTS "WaitlistEntry_expiresAt_idx" ON "WaitlistEntry"("expiresAt");

DO $$ BEGIN
  ALTER TABLE "WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "TicketBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
