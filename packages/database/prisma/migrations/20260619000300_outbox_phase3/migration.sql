ALTER TABLE "OutboxEvent" ADD COLUMN IF NOT EXISTS "type" TEXT;
ALTER TABLE "OutboxEvent" ADD COLUMN IF NOT EXISTS "attempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "OutboxEvent" ADD COLUMN IF NOT EXISTS "nextRunAt" TIMESTAMP(3);
ALTER TABLE "OutboxEvent" ADD COLUMN IF NOT EXISTS "processedAt" TIMESTAMP(3);
ALTER TABLE "OutboxEvent" ADD COLUMN IF NOT EXISTS "requestId" TEXT;

UPDATE "OutboxEvent"
SET "type" = "aggregateType"
WHERE "type" IS NULL;

CREATE INDEX IF NOT EXISTS "OutboxEvent_type_idx" ON "OutboxEvent"("type");
CREATE INDEX IF NOT EXISTS "OutboxEvent_status_nextRunAt_idx" ON "OutboxEvent"("status", "nextRunAt");
CREATE INDEX IF NOT EXISTS "OutboxEvent_requestId_idx" ON "OutboxEvent"("requestId");
