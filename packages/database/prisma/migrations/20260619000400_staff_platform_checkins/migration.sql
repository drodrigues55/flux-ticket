CREATE TABLE IF NOT EXISTS "Checkin" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "ticketId" TEXT,
  "offlineId" TEXT,
  "deviceId" TEXT,
  "deviceName" TEXT,
  "operatorId" TEXT,
  "sectorId" INTEGER,
  "status" TEXT NOT NULL DEFAULT 'ACCEPTED',
  "conflictReason" TEXT,
  "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "requestId" TEXT,
  "rawPayload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Checkin_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Checkin_eventId_offlineId_key" ON "Checkin"("eventId", "offlineId");
CREATE UNIQUE INDEX IF NOT EXISTS "Checkin_ticketId_accepted_key" ON "Checkin"("ticketId") WHERE "status" = 'ACCEPTED' AND "ticketId" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "Checkin_eventId_ticketId_idx" ON "Checkin"("eventId", "ticketId");
CREATE INDEX IF NOT EXISTS "Checkin_ticketId_status_idx" ON "Checkin"("ticketId", "status");
CREATE INDEX IF NOT EXISTS "Checkin_eventId_status_syncedAt_idx" ON "Checkin"("eventId", "status", "syncedAt");
CREATE INDEX IF NOT EXISTS "Checkin_deviceId_syncedAt_idx" ON "Checkin"("deviceId", "syncedAt");
CREATE INDEX IF NOT EXISTS "Checkin_requestId_idx" ON "Checkin"("requestId");

ALTER TABLE "Checkin"
  ADD CONSTRAINT "Checkin_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Checkin"
  ADD CONSTRAINT "Checkin_ticketId_fkey"
  FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE SET NULL ON UPDATE CASCADE;
