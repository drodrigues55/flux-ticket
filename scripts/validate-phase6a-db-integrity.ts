import { prisma } from '@flux/database';

async function main() {
  const [
    paymentsWithoutOrder,
    issuedTicketsWithoutOrder,
    waitlistWithoutEvent,
    waitlistWithoutBatch,
    duplicateApprovedTicketHistory,
    duplicateApprovedPaymentAudit,
  ] = await Promise.all([
    prisma.payment.count({ where: { orderId: null } }),
    prisma.ticket.count({ where: { status: { in: ['VALID', 'PENDING_PAYMENT'] }, orderId: null } }),
    (prisma as any).waitlistEntry.count({ where: { event: null } }).catch(() => 0),
    (prisma as any).waitlistEntry.count({ where: { batch: null } }).catch(() => 0),
    prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count
      FROM (
        SELECT "ticketId"
        FROM "TicketStatusHistory"
        WHERE "reason" IN ('PAYMENT_APPROVED', 'PAYMENT_RECOVERED_APPROVED')
        GROUP BY "ticketId"
        HAVING COUNT(*) > 1
      ) duplicates
    `,
    prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count
      FROM (
        SELECT "entityId"
        FROM "AuditLog"
        WHERE "entityType" = 'Payment'
          AND "action" = 'PAYMENT_STATUS_CHANGED'
          AND "reason" IN ('PAYMENT_APPROVED', 'PAYMENT_RECOVERED_APPROVED')
        GROUP BY "entityId"
        HAVING COUNT(*) > 1
      ) duplicates
    `,
  ]);

  console.log(`paymentsWithoutOrder=${paymentsWithoutOrder}`);
  console.log(`issuedTicketsWithoutOrder=${issuedTicketsWithoutOrder}`);
  console.log(`waitlistWithoutEvent=${waitlistWithoutEvent}`);
  console.log(`waitlistWithoutBatch=${waitlistWithoutBatch}`);
  console.log(`duplicateApprovedTicketHistory=${Number(duplicateApprovedTicketHistory[0]?.count ?? 0)}`);
  console.log(`duplicateApprovedPaymentAudit=${Number(duplicateApprovedPaymentAudit[0]?.count ?? 0)}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
