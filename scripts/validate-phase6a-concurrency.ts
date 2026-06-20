import { prisma } from '@flux/database';

function assertEqual(actual: number, expected: number, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

async function makeFixture(tag: string) {
  const organizer = await prisma.user.create({
    data: {
      email: `${tag}-organizer@example.com`,
      name: 'Concurrency Organizer',
      password: 'x',
      role: 'ORGANIZER',
    },
  });
  const buyer = await prisma.user.create({
    data: {
      email: `${tag}-buyer@example.com`,
      name: 'Concurrency Buyer',
      password: 'x',
      role: 'USER',
    },
  });
  const event = await prisma.event.create({
    data: {
      title: `Concurrency Event ${tag}`,
      date: new Date(Date.now() + 86400000),
      location: 'Concurrency Venue',
      organizerId: organizer.id,
      status: 'PUBLISHED',
    },
  });
  const batch = await prisma.ticketBatch.create({
    data: {
      eventId: event.id,
      name: 'Concurrency Batch',
      price: 100,
      totalQuantity: 1,
      availableQuantity: 1,
    },
  });
  const reservation = await (prisma as any).reservation.create({
    data: {
      eventId: event.id,
      buyerId: buyer.id,
      status: 'ACTIVE',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });
  const reservationItem = await (prisma as any).reservationItem.create({
    data: {
      reservationId: reservation.id,
      batchId: batch.id,
      quantity: 1,
      unitPrice: 100,
    },
  });
  const ticket = await prisma.ticket.create({
    data: {
      eventId: event.id,
      batchId: batch.id,
      buyerId: buyer.id,
      reservationId: reservation.id,
      reservationItemId: reservationItem.id,
      buyerCpf: '000.000.000-00',
      price: 100,
      status: 'PENDING_PAYMENT',
      channel: 'ONLINE',
      meiaEntrada: false,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });
  const order = await (prisma as any).order.create({
    data: {
      reservationId: reservation.id,
      eventId: event.id,
      buyerId: buyer.id,
      status: 'PROCESSING',
      grossAmount: 100,
      netAmount: 100,
    },
  });
  await prisma.ticket.update({ where: { id: ticket.id }, data: { orderId: order.id } });
  const payment = await prisma.payment.create({
    data: {
      eventId: event.id,
      buyerId: buyer.id,
      orderId: order.id,
      method: 'PIX',
      status: 'PENDING',
      amount: 100,
      installments: 1,
      provider: 'MOCK',
      providerPaymentId: `${tag}-recover-approved`,
      providerStatus: 'pending',
      idempotencyKey: `${tag}-idem`,
      rawPayload: { fixture: true },
      tickets: { connect: [{ id: ticket.id }] },
    },
  });

  return { organizer, buyer, event, batch, reservation, ticket, order, payment };
}

async function cleanup(ids: { organizerId?: string; buyerId?: string; eventId?: string; batchId?: string; reservationId?: string; ticketId?: string; orderId?: string; paymentId?: string }) {
  await prisma.outboxEvent.deleteMany({ where: { aggregateId: { in: [ids.reservationId, ids.ticketId, ids.orderId, ids.paymentId, ids.batchId, ids.eventId].filter(Boolean) as string[] } } }).catch(() => undefined);
  await prisma.auditLog.deleteMany({ where: { entityId: { in: [ids.reservationId, ids.ticketId, ids.orderId, ids.paymentId, ids.batchId, ids.eventId].filter(Boolean) as string[] } } }).catch(() => undefined);
  await prisma.saleLog.deleteMany({ where: { OR: [{ ticketId: ids.ticketId }, { eventId: ids.eventId }, { paymentId: ids.paymentId }] } }).catch(() => undefined);
  await prisma.dailySalesSnapshot.deleteMany({ where: { eventId: ids.eventId } }).catch(() => undefined);
  await prisma.payment.deleteMany({ where: { id: ids.paymentId } }).catch(() => undefined);
  await prisma.ticket.deleteMany({ where: { id: ids.ticketId } }).catch(() => undefined);
  await (prisma as any).reservationItem.deleteMany({ where: { reservationId: ids.reservationId } }).catch(() => undefined);
  await (prisma as any).reservation.deleteMany({ where: { id: ids.reservationId } }).catch(() => undefined);
  await (prisma as any).order.deleteMany({ where: { id: ids.orderId } }).catch(() => undefined);
  await prisma.ticketBatch.deleteMany({ where: { id: ids.batchId } }).catch(() => undefined);
  await prisma.event.deleteMany({ where: { id: ids.eventId } }).catch(() => undefined);
  await prisma.user.deleteMany({ where: { id: { in: [ids.organizerId, ids.buyerId].filter(Boolean) as string[] } } }).catch(() => undefined);
}

async function runConcurrentApprovals(concurrency: number) {
  const { PaymentsService } = await import('../services/api-write/dist/payments/payments.service.js');
  const { MockPaymentProvider } = await import('../services/api-write/dist/payments/mock-payment.provider.js');
  const { TicketCryptoService } = await import('../services/api-write/dist/tickets/ticket-crypto.service.js');
  const { AuditService } = await import('../services/api-write/dist/audit/audit.service.js');
  const auditService = new AuditService();
  const fluxEngine = {
    async releaseTicketLock() {
      return;
    },
    async extendTicketLock() {
      return true;
    },
  } as any;
  const service = new PaymentsService(fluxEngine, new TicketCryptoService(), auditService, new MockPaymentProvider() as any);
  const tag = `concurrency-${concurrency}-${Date.now()}`;
  const fixture = await makeFixture(tag);
  try {
    await Promise.all(Array.from({ length: concurrency }, () => service.handleWebhookNotification(fixture.payment.providerPaymentId!)));

    const [paymentCount, paidCount, ticketCount, batchAfter, issueHistoryCount, auditCount] = await Promise.all([
      prisma.payment.count({ where: { id: fixture.payment.id } }),
      (prisma as any).order.count({ where: { id: fixture.order.id, status: 'PAID' } }),
      prisma.ticket.count({ where: { id: fixture.ticket.id, status: 'VALID' } }),
      prisma.ticketBatch.findUnique({ where: { id: fixture.batch.id }, select: { availableQuantity: true } }),
      (prisma as any).ticketStatusHistory.count({ where: { ticketId: fixture.ticket.id, reason: 'PAYMENT_APPROVED' } }),
      prisma.auditLog.count({ where: { entityType: 'Payment', entityId: fixture.payment.id, action: 'PAYMENT_STATUS_CHANGED' } }),
    ]);

    assertEqual(paymentCount, 1, `${concurrency}x payment count`);
    assertEqual(paidCount, 1, `${concurrency}x order completion`);
    assertEqual(ticketCount, 1, `${concurrency}x ticket issuance`);
    assertEqual(batchAfter?.availableQuantity ?? -1, 1, `${concurrency}x inventory unchanged after single approval`);
    assertEqual(issueHistoryCount, 1, `${concurrency}x issue history`);
    assertEqual(auditCount, 1, `${concurrency}x approval audit`);

    return { concurrency, ok: true as const };
  } finally {
    await cleanup({
      organizerId: fixture.organizer.id,
      buyerId: fixture.buyer.id,
      eventId: fixture.event.id,
      batchId: fixture.batch.id,
      reservationId: fixture.reservation.id,
      ticketId: fixture.ticket.id,
      orderId: fixture.order.id,
      paymentId: fixture.payment.id,
    });
  }
}

async function main() {
  for (const concurrency of [10, 25, 50]) {
    try {
      const result = await runConcurrentApprovals(concurrency);
      console.log(`PASS ${result.concurrency} concurrent approvals`);
    } catch (error) {
      console.log(`FAIL ${concurrency} concurrent approvals - ${(error as Error).message}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(async () => {
  await prisma.$disconnect();
});
