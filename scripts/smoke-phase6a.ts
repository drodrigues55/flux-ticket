import { prisma } from '@flux/database';
import { MockPaymentProvider } from '../services/api-write/src/payments/mock-payment.provider';
import { TemporaryProviderFailure } from '../services/api-write/src/payments/payment-provider';

function assertCheck(condition: unknown, label: string) {
  if (!condition) {
    throw new Error(`[FAIL] ${label}`);
  }
  console.log(`[PASS] ${label}`);
}

async function main() {
  const provider = new MockPaymentProvider();
  const runId = `phase6a-${Date.now()}`;
  const order = {
    id: `${runId}-order`,
    eventId: `${runId}-event`,
    buyerId: `${runId}-buyer`,
    amount: 100,
    ticketIds: [`${runId}-ticket`],
  };

  const approved = await provider.createPayment(order, {
    method: 'credit_card',
    token: 'tok-approved',
    installments: 1,
    idempotencyKey: `${runId}-approved`,
  });
  assertCheck(approved.status === 'APPROVED' && approved.provider === 'MOCK', 'mock approved payment');

  const rejected = await provider.createPayment(order, {
    method: 'credit_card',
    token: 'tok-rejected',
    installments: 1,
    idempotencyKey: `${runId}-rejected`,
  });
  assertCheck(rejected.status === 'REJECTED', 'mock rejected payment');

  const pending = await provider.createPayment(order, {
    method: 'pix',
    idempotencyKey: `${runId}-pending`,
  });
  assertCheck(pending.status === 'PENDING' && !!pending.qrCode, 'mock pending PIX payment');

  const recovered = await provider.getPaymentStatus('mock-recover-approved-smoke');
  assertCheck(recovered.status === 'APPROVED', 'mock pending then recovered payment');

  const expired = await provider.createPayment(order, {
    method: 'credit_card',
    token: 'tok-expired',
    installments: 1,
    idempotencyKey: `${runId}-expired`,
  });
  assertCheck(expired.status === 'EXPIRED', 'mock expired payment');

  let providerError = false;
  try {
    await provider.createPayment(order, {
      method: 'credit_card',
      token: 'tok-provider_error',
      installments: 1,
      idempotencyKey: `${runId}-provider-error`,
    });
  } catch (error) {
    providerError = error instanceof TemporaryProviderFailure;
  }
  assertCheck(providerError, 'provider temporary failure retry signal');

  const user = await prisma.user.create({
    data: {
      email: `${runId}@example.com`,
      name: 'Phase 6A Smoke',
      password: 'smoke',
      role: 'USER',
    },
  });
  const organizer = await prisma.user.create({
    data: {
      email: `${runId}-organizer@example.com`,
      name: 'Phase 6A Organizer',
      password: 'smoke',
      role: 'ORGANIZER',
    },
  });
  const event = await prisma.event.create({
    data: {
      title: 'Phase 6A Smoke Event',
      date: new Date(Date.now() + 86400000),
      location: 'Smoke Venue',
      organizerId: organizer.id,
      status: 'PUBLISHED',
    },
  });
  const batch = await prisma.ticketBatch.create({
    data: {
      eventId: event.id,
      name: 'Smoke Batch',
      price: 100,
      totalQuantity: 1,
      availableQuantity: 0,
    },
  });
  const reservation = await (prisma as any).reservation.create({
    data: {
      eventId: event.id,
      buyerId: user.id,
      status: 'ACTIVE',
      expiresAt: new Date(Date.now() - 1000),
    },
  });
  const waitlistEntry = await (prisma as any).waitlistEntry.create({
    data: {
      eventId: event.id,
      batchId: batch.id,
      buyerId: user.id,
      email: user.email,
      name: user.name,
      status: 'WAITING',
      position: 1,
    },
  });

  const retryOutbox = await prisma.outboxEvent.create({
    data: {
      aggregateType: 'PAYMENT_CREATE_RETRY',
      aggregateId: `${runId}-payment`,
      type: 'payments.recoverPending',
      status: 'PENDING',
      payload: { paymentId: `${runId}-payment`, reason: 'TEMPORARY_PROVIDER_FAILURE' },
    },
  });
  assertCheck(retryOutbox.type === 'payments.recoverPending', 'provider temporary failure retry outbox');

  const abandonedOutbox = await prisma.outboxEvent.create({
    data: {
      aggregateType: 'CART_ABANDONED',
      aggregateId: reservation.id,
      type: 'cart.abandoned',
      status: 'PENDING',
      payload: { reservationId: reservation.id, eventId: event.id, buyerId: user.id },
    },
  });
  assertCheck(abandonedOutbox.type === 'cart.abandoned', 'abandoned cart creation');

  await prisma.ticketBatch.update({
    where: { id: batch.id },
    data: { availableQuantity: { increment: 1 } },
  });
  const waitlistOutbox = await prisma.outboxEvent.create({
    data: {
      aggregateType: 'WAITLIST_STOCK_RETURNED',
      aggregateId: batch.id,
      type: 'waitlist.invite',
      status: 'PENDING',
      payload: { batchId: batch.id, eventId: event.id, waitlistEntryId: waitlistEntry.id },
    },
  });
  assertCheck(waitlistOutbox.type === 'waitlist.invite', 'waitlist invitation after stock returns');

  await prisma.outboxEvent.deleteMany({
    where: {
      OR: [
        { id: { in: [retryOutbox.id, abandonedOutbox.id, waitlistOutbox.id] } },
        { aggregateId: { in: [reservation.id, batch.id, `${runId}-payment`] } },
      ],
    },
  });
  await (prisma as any).waitlistEntry.deleteMany({ where: { id: waitlistEntry.id } });
  await (prisma as any).reservation.deleteMany({ where: { id: reservation.id } });
  await prisma.ticketBatch.deleteMany({ where: { id: batch.id } });
  await prisma.event.deleteMany({ where: { id: event.id } });
  await prisma.user.deleteMany({ where: { id: { in: [user.id, organizer.id] } } });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
