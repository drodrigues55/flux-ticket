CREATE UNIQUE INDEX IF NOT EXISTS "TicketStatusHistory_ticketId_paymentApproved_once_idx"
ON "TicketStatusHistory"("ticketId")
WHERE "reason" IN ('PAYMENT_APPROVED', 'PAYMENT_RECOVERED_APPROVED');

CREATE UNIQUE INDEX IF NOT EXISTS "AuditLog_paymentApproved_once_idx"
ON "AuditLog"("entityType", "entityId", "action")
WHERE "entityType" = 'Payment'
  AND "action" = 'PAYMENT_STATUS_CHANGED'
  AND "reason" IN ('PAYMENT_APPROVED', 'PAYMENT_RECOVERED_APPROVED');
