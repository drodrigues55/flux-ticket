import { prisma } from '@flux/database';
import { Job, Worker } from 'bullmq';
import * as crypto from 'crypto';
import { moveJobToDeadLetter } from './dead-letter';
import { createRedisConnection } from './redis';
import { ACTIVE_QUEUE_NAMES, DEFAULT_JOB_OPTIONS, QUEUE_NAMES, QueueName } from './queue-registry';
import { logger } from './logger';
import { captureException } from './sentry';
import { InternalPaymentStatus } from './payment-provider';
import { getPaymentProvider } from './payment-provider-registry';
import { BatchProgressionService } from './batch-progression';

const connection = createRedisConnection();
const FINAL_PAYMENT_STATUSES: InternalPaymentStatus[] = ['APPROVED', 'REJECTED', 'EXPIRED', 'CANCELLED', 'REFUNDED'];
const batchProgressionService = new BatchProgressionService();

function generateSignature(ticketId: string, version: number = 1): string {
  const payload = `${ticketId}:${version}`;
  return crypto
    .createHmac('sha256', process.env.HMAC_SECRET_KEY || 'default-super-secret-key-12345')
    .update(payload)
    .digest('hex');
}

async function auditTransition(input: {
  action: string;
  entityType: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  reason: string;
  requestId?: string | null;
  metadata?: unknown;
}) {
  await prisma.auditLog.create({
    data: {
      actorRole: 'SYSTEM',
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      before: input.before as any,
      after: input.after as any,
      reason: input.reason,
      requestId: input.requestId ?? null,
      metadata: input.metadata as any,
    },
  }).catch(() => undefined);
}

async function enqueueWaitlistInvite(batchId: string, eventId: string, requestId?: string | null, source?: string) {
  await prisma.outboxEvent.create({
    data: {
      aggregateType: 'WAITLIST_STOCK_RETURNED',
      aggregateId: batchId,
      type: QUEUE_NAMES.waitlistInvite,
      status: 'PENDING',
      nextRunAt: new Date(),
      requestId: requestId ?? null,
      payload: { batchId, eventId, source: source ?? null },
    },
  });
}

async function issueTicketsForPayment(payment: any, providerStatus: string, requestId?: string | null) {
  const result = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Payment" WHERE id = ${payment.id} FOR UPDATE`;

    const lockedPayment = await tx.payment.findUnique({
      where: { id: payment.id },
      include: { tickets: true, order: true },
    });

    if (!lockedPayment || lockedPayment.status === 'APPROVED') {
      return { issuedTickets: [] as any[] };
    }

    const issuedTickets: any[] = [];
    for (const ticket of lockedPayment.tickets ?? []) {
      if (ticket.status === 'VALID' || ticket.status === 'CONSUMED') continue;
      const newStatus = ticket.meiaEntrada ? 'PENDING_VALIDATION' : 'VALID';
      const signature = generateSignature(ticket.id, 1);
      const updated = await tx.ticket.updateMany({
        where: {
          id: ticket.id,
          status: { in: ['PENDING_PAYMENT', 'PENDING_VALIDATION'] as any },
        },
        data: {
          status: newStatus as any,
          hmacSignature: signature,
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
      });

      if (updated.count !== 1) continue;

      await tx.ticketStatusHistory.create({
        data: {
          ticketId: ticket.id,
          fromStatus: ticket.status,
          toStatus: newStatus as any,
          reason: 'PAYMENT_APPROVED',
          actorId: ticket.buyerId,
          requestId: requestId ?? null,
          metadata: { paymentId: lockedPayment.id, providerPaymentId: lockedPayment.providerPaymentId, providerStatus },
        },
      }).catch(() => undefined);

      issuedTickets.push(ticket);
    }

    await tx.payment.update({
      where: { id: lockedPayment.id },
      data: { status: 'APPROVED', providerStatus, paidAt: new Date() },
    });

    if (lockedPayment.orderId && lockedPayment.order?.status !== 'PAID') {
      await (tx as any).order.update({ where: { id: lockedPayment.orderId }, data: { status: 'PAID' } }).catch(() => undefined);
    }
    if (lockedPayment.order?.reservationId) {
      await (tx as any).reservation.updateMany({
        where: { id: lockedPayment.order.reservationId, status: { not: 'CONVERTED' } },
        data: { status: 'CONVERTED' },
      }).catch(() => undefined);
    }

    await tx.auditLog.create({
      data: {
        actorRole: 'SYSTEM',
        action: 'PAYMENT_STATUS_CHANGED',
        entityType: 'Payment',
        entityId: lockedPayment.id,
        before: { status: lockedPayment.status },
        after: { status: 'APPROVED' },
        reason: 'PAYMENT_APPROVED',
        requestId: requestId ?? null,
        metadata: { providerPaymentId: lockedPayment.providerPaymentId },
      },
    }).catch(() => undefined);

    return { issuedTickets };
  });

  for (const ticket of result.issuedTickets) {
    await connection.del(`lock:{${ticket.batchId}}:${ticket.buyerId}:${ticket.id}`);
  }
}

async function releaseTicketsForPayment(payment: any, status: InternalPaymentStatus, providerStatus: string, requestId?: string | null) {
  for (const ticket of payment.tickets ?? []) {
    if (ticket.status === 'REVOKED' || ticket.status === 'VALID' || ticket.status === 'CONSUMED') continue;

    await connection.del(`lock:{${ticket.batchId}}:${ticket.buyerId}:${ticket.id}`);
    await connection.incr(`stock:{${ticket.batchId}}`);
    await prisma.ticketBatch.update({
      where: { id: ticket.batchId },
      data: { availableQuantity: { increment: 1 } },
    });
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: { status: 'REVOKED', expiresAt: new Date() },
    });
    await prisma.ticketStatusHistory.create({
      data: {
        ticketId: ticket.id,
        fromStatus: ticket.status,
        toStatus: 'REVOKED',
        reason: `PAYMENT_RECOVERED_${status}`,
        actorId: ticket.buyerId,
        requestId: requestId ?? null,
        metadata: { paymentId: payment.id, providerPaymentId: payment.providerPaymentId, providerStatus },
      },
    }).catch(() => undefined);
    await enqueueWaitlistInvite(ticket.batchId, ticket.eventId, requestId, `PAYMENT_RECOVERED_${status}`);
  }

  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: status as any, providerStatus },
  });
  if (payment.orderId) {
    await (prisma as any).order.update({ where: { id: payment.orderId }, data: { status: status === 'EXPIRED' ? 'EXPIRED' : 'FAILED' } }).catch(() => undefined);
  }
  if (payment.order?.reservationId) {
    await (prisma as any).reservation.update({ where: { id: payment.order.reservationId }, data: { status: status === 'EXPIRED' ? 'EXPIRED' : 'CANCELLED' } }).catch(() => undefined);
  }

  await auditTransition({
    action: 'PAYMENT_STATUS_CHANGED',
    entityType: 'Payment',
    entityId: payment.id,
    before: { status: payment.status },
    after: { status },
    reason: `PAYMENT_RECOVERED_${status}`,
    requestId,
    metadata: { providerPaymentId: payment.providerPaymentId },
  });
}

async function handleHalfPriceDeadline(job: Job) {
  const payload = job.data?.payload ?? job.data;
  const { ticketId, batchId } = payload;

  if (!ticketId || !batchId) {
    logger.warn({ queueName: QUEUE_NAMES.halfPriceValidateDeadline, jobId: job.id, requestId: job.data?.requestId }, 'half-price deadline job missing ticketId or batchId');
    return;
  }

  logger.info({ queueName: QUEUE_NAMES.halfPriceValidateDeadline, jobId: job.id, requestId: job.data?.requestId, eventId: payload.eventId, ticketId }, 'checking half-price validation deadline');

  await prisma.$transaction(async (tx) => {
    const ticket = await tx.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      logger.warn({ queueName: QUEUE_NAMES.halfPriceValidateDeadline, jobId: job.id, ticketId }, 'ticket not found');
      return;
    }

    const outbox = await tx.outboxEvent.findFirst({
      where: {
        aggregateId: ticketId,
        aggregateType: 'TICKET_RESERVED',
      },
    });
    const isHalfPrice = (outbox?.payload as any)?.isHalfPrice === true || payload?.isHalfPrice === true;

    if (!isHalfPrice) {
      logger.info({ queueName: QUEUE_NAMES.halfPriceValidateDeadline, jobId: job.id, ticketId }, 'ticket is not half-price');
      return;
    }

    if (ticket.status !== 'PENDING_VALIDATION') {
      logger.info({ queueName: QUEUE_NAMES.halfPriceValidateDeadline, jobId: job.id, ticketId, status: ticket.status }, 'ticket already handled');
      return;
    }

    if (ticket.hmacSignature) {
      logger.info({ queueName: QUEUE_NAMES.halfPriceValidateDeadline, jobId: job.id, ticketId }, 'half-price ticket already has signature');
      return;
    }

    await tx.ticket.update({
      where: { id: ticketId },
      data: { status: 'REVOKED' },
    });

    await tx.ticketBatch.update({
      where: { id: batchId },
      data: {
        availableQuantity: {
          increment: 1,
        },
      },
    });

    await tx.ticketStatusHistory.create({
      data: {
        ticketId,
        fromStatus: ticket.status,
        toStatus: 'REVOKED',
        reason: 'HALF_PRICE_VALIDATION_DEADLINE_EXPIRED',
        requestId: job.data?.requestId ?? null,
        metadata: {
          outboxEventId: job.data?.outboxEventId ?? null,
          queue: QUEUE_NAMES.halfPriceValidateDeadline,
        },
      },
    }).catch(() => undefined);

    await tx.auditLog.create({
      data: {
        actorRole: 'SYSTEM',
        action: 'TICKET_STATUS_CHANGED',
        entityType: 'Ticket',
        entityId: ticketId,
        before: { status: ticket.status },
        after: { status: 'REVOKED' },
        reason: 'HALF_PRICE_VALIDATION_DEADLINE_EXPIRED',
        requestId: job.data?.requestId ?? null,
        metadata: {
          outboxEventId: job.data?.outboxEventId ?? null,
          queue: QUEUE_NAMES.halfPriceValidateDeadline,
        },
      },
    }).catch(() => undefined);
  });

  await connection.incr(`stock:{${batchId}}`);
}

async function handlePaymentsWebhook(job: Job) {
  const payload = job.data?.payload ?? {};
  const paymentId = payload.paymentId?.toString() || payload.providerPaymentId?.toString();

  if (!paymentId) {
    logger.info({ queueName: QUEUE_NAMES.paymentsWebhook, jobId: job.id, requestId: job.data?.requestId }, 'payments webhook job has no paymentId');
    return;
  }

  const payment = await prisma.payment.findFirst({
    where: { providerPaymentId: paymentId },
    include: { tickets: true, order: true },
  });

  if (!payment) {
    logger.warn({ queueName: QUEUE_NAMES.paymentsWebhook, jobId: job.id, requestId: job.data?.requestId, paymentId }, 'payment not found locally');
    return;
  }

  if (FINAL_PAYMENT_STATUSES.includes(payment.status as InternalPaymentStatus)) {
    return;
  }

  const providerStatus = payload.providerStatus?.toString() || payload.status?.toString() || 'pending';
  const normalized = providerStatus === 'approved'
    ? 'APPROVED'
    : providerStatus === 'rejected'
      ? 'REJECTED'
      : providerStatus === 'expired'
        ? 'EXPIRED'
        : 'PENDING';

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      providerStatus,
      providerEventId: payload.providerEventId ?? payment.providerEventId,
      rawPayload: {
        ...(typeof payment.rawPayload === 'object' && payment.rawPayload ? (payment.rawPayload as any) : {}),
        lastWebhook: payload,
      },
    },
  });

  if (normalized === 'APPROVED') {
    await issueTicketsForPayment(payment, providerStatus, job.data?.requestId);
  } else if (normalized === 'REJECTED' || normalized === 'EXPIRED') {
    await releaseTicketsForPayment(payment, normalized, providerStatus, job.data?.requestId);
  }
}

async function handlePaymentsRecoverPending(job: Job) {
  const payload = job.data?.payload ?? {};
  const payments = payload.paymentId
    ? await prisma.payment.findMany({
        where: { id: payload.paymentId },
        include: { tickets: true, order: true },
      })
    : await prisma.payment.findMany({
        where: { status: { in: ['PENDING', 'FAILED'] as any }, providerPaymentId: { not: null } },
        take: 50,
        orderBy: { createdAt: 'asc' },
        include: { tickets: true, order: true },
      });

  for (const payment of payments) {
    if (FINAL_PAYMENT_STATUSES.includes(payment.status as InternalPaymentStatus)) continue;

    const provider = getPaymentProvider(payment.provider);
    const providerResult = await provider.getPaymentStatus(payment.providerPaymentId || '');

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        providerStatus: providerResult.providerStatus,
        providerEventId: providerResult.providerEventId ?? payment.providerEventId,
        rawPayload: providerResult.rawPayload as any,
        rawResponse: providerResult as any,
      },
    });

    if (providerResult.status === 'PENDING') {
      await auditTransition({
        action: 'PAYMENT_STATUS_CHECKED',
        entityType: 'Payment',
        entityId: payment.id,
        after: { status: 'PENDING', providerStatus: providerResult.providerStatus },
        reason: 'PAYMENT_STILL_PENDING',
        requestId: job.data?.requestId,
        metadata: { providerPaymentId: payment.providerPaymentId },
      });
      continue;
    }

    if (providerResult.status === 'APPROVED') {
      await issueTicketsForPayment(payment, providerResult.providerStatus, job.data?.requestId);
    } else if (providerResult.status === 'REJECTED' || providerResult.status === 'EXPIRED' || providerResult.status === 'CANCELLED' || providerResult.status === 'FAILED') {
      await releaseTicketsForPayment(payment, providerResult.status, providerResult.providerStatus, job.data?.requestId);
    }
  }
}

async function handleCartsExpireAbandoned(job: Job) {
  const payload = job.data?.payload ?? {};
  const now = new Date();
  const reservations = await (prisma as any).reservation.findMany({
    where: payload.reservationId
      ? { id: payload.reservationId, status: 'ACTIVE', expiresAt: { lte: now } }
      : { status: 'ACTIVE', expiresAt: { lte: now } },
    take: 50,
    include: { tickets: true, orders: true, items: true },
  });

  for (const reservation of reservations) {
    for (const ticket of reservation.tickets) {
      if (ticket.status === 'VALID' || ticket.status === 'CONSUMED' || ticket.status === 'REVOKED') continue;
      await connection.del(`lock:{${ticket.batchId}}:${ticket.buyerId}:${ticket.id}`);
      await connection.incr(`stock:{${ticket.batchId}}`);
      await prisma.ticketBatch.update({
        where: { id: ticket.batchId },
        data: { availableQuantity: { increment: 1 } },
      });
      await prisma.ticket.update({
        where: { id: ticket.id },
        data: { status: 'REVOKED', expiresAt: now },
      });
      await enqueueWaitlistInvite(ticket.batchId, ticket.eventId, job.data?.requestId, 'CART_ABANDONED');
    }

    await (prisma as any).reservation.update({
      where: { id: reservation.id },
      data: { status: 'ABANDONED' },
    });
    for (const order of reservation.orders) {
      if (order.status !== 'PAID') {
        await (prisma as any).order.update({ where: { id: order.id }, data: { status: 'EXPIRED' } }).catch(() => undefined);
      }
    }

    await auditTransition({
      action: 'CART_ABANDONED',
      entityType: 'Reservation',
      entityId: reservation.id,
      before: { status: reservation.status },
      after: { status: 'ABANDONED' },
      reason: 'RESERVATION_EXPIRED_WITHOUT_PAYMENT',
      requestId: job.data?.requestId,
    });

    await prisma.outboxEvent.create({
      data: {
        aggregateType: 'CART_ABANDONED',
        aggregateId: reservation.id,
        type: 'cart.abandoned',
        status: 'PENDING',
        processedAt: new Date(),
        payload: { reservationId: reservation.id, eventId: reservation.eventId, buyerId: reservation.buyerId },
      },
    });
    await prisma.outboxEvent.create({
      data: {
        aggregateType: 'NOTIFICATION_PLACEHOLDER',
        aggregateId: reservation.id,
        type: QUEUE_NAMES.notificationsPlaceholder,
        status: 'PENDING',
        nextRunAt: new Date(),
        payload: { kind: 'cart.abandoned', reservationId: reservation.id, buyerId: reservation.buyerId },
      },
    });
  }
}

async function handleWaitlistInvite(job: Job) {
  const payload = job.data?.payload ?? {};
  const batchId = payload.batchId?.toString();
  if (!batchId) return;

  const batch = await prisma.ticketBatch.findUnique({ where: { id: batchId } });
  if (!batch || batch.availableQuantity <= 0) return;

  const entry = await (prisma as any).waitlistEntry.findFirst({
    where: { batchId, status: 'WAITING' },
    orderBy: { position: 'asc' },
  });
  if (!entry) return;

  const user = entry.buyerId
    ? await prisma.user.findUnique({ where: { id: entry.buyerId } })
    : await prisma.user.upsert({
        where: { email: entry.email },
        create: { email: entry.email, name: entry.name || entry.email, password: 'waitlist-placeholder', role: 'USER' },
        update: {},
      });
  if (!user) return;

  const reservationExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
  const ticketId = crypto.randomUUID();
  await prisma.$transaction(async (tx) => {
    const reservation = await (tx as any).reservation.create({
      data: {
        eventId: batch.eventId,
        buyerId: user.id,
        status: 'ACTIVE',
        expiresAt: reservationExpiresAt,
      },
    });
    const reservationItem = await (tx as any).reservationItem.create({
      data: {
        reservationId: reservation.id,
        batchId,
        quantity: 1,
        unitPrice: batch.price,
      },
    });
    await tx.ticketBatch.update({
      where: { id: batchId },
      data: { availableQuantity: { decrement: 1 } },
    });
    await tx.ticket.create({
      data: {
        id: ticketId,
        eventId: batch.eventId,
        batchId,
        buyerId: user.id,
        reservationId: reservation.id,
        reservationItemId: reservationItem.id,
        buyerCpf: '000.000.000-00',
        price: batch.price,
        status: 'PENDING_VALIDATION',
        channel: 'ONLINE',
        meiaEntrada: batch.meiaEntrada,
        expiresAt: reservationExpiresAt,
      },
    });
    await (tx as any).waitlistEntry.update({
      where: { id: entry.id },
      data: {
        status: 'INVITED',
        invitedAt: new Date(),
        expiresAt: reservationExpiresAt,
        reservationId: reservation.id,
      },
    });
    await tx.outboxEvent.create({
      data: {
        aggregateType: 'WAITLIST_INVITED',
        aggregateId: entry.id,
        type: QUEUE_NAMES.notificationsPlaceholder,
        status: 'PENDING',
        nextRunAt: new Date(),
        payload: { kind: 'waitlist.invited', waitlistEntryId: entry.id, reservationId: reservation.id, ticketId, expiresAt: reservationExpiresAt.toISOString() },
      },
    });
    await tx.outboxEvent.create({
      data: {
        aggregateType: 'CART_EXPIRE_ABANDONED',
        aggregateId: reservation.id,
        type: QUEUE_NAMES.cartsExpireAbandoned,
        status: 'PENDING',
        nextRunAt: reservationExpiresAt,
        payload: { reservationId: reservation.id },
      },
    });
  });

  await connection.decr(`stock:{${batchId}}`);
  await auditTransition({
    action: 'WAITLIST_INVITED',
    entityType: 'WaitlistEntry',
    entityId: entry.id,
    before: { status: entry.status },
    after: { status: 'INVITED', ticketId },
    reason: 'STOCK_RETURNED',
    requestId: job.data?.requestId,
  });
}

async function handleNotificationsPlaceholder(job: Job) {
  logger.info({ queueName: QUEUE_NAMES.notificationsPlaceholder, jobId: job.id, payload: job.data?.payload }, 'placeholder notification accepted');
}

async function handleTicketsIssue(job: Job) {
  logger.info({ queueName: QUEUE_NAMES.ticketsIssue, jobId: job.id, requestId: job.data?.requestId }, 'tickets.issue job accepted');
}

async function handleCheckinsSync(job: Job) {
  logger.info({ queueName: QUEUE_NAMES.checkinsSync, jobId: job.id, requestId: job.data?.requestId }, 'checkins.sync job accepted');
}

async function handleAnalyticsAggregate(job: Job) {
  logger.info({ queueName: QUEUE_NAMES.analyticsAggregate, jobId: job.id, requestId: job.data?.requestId }, 'analytics.aggregate job accepted');
}

async function handleBatchesProgressionCheck(job: Job) {
  logger.info({ queueName: QUEUE_NAMES.batchesProgressionCheck, jobId: job.id }, 'batches.progressionCheck job accepted');
  await batchProgressionService.processBatchTransitions();
}

async function processJob(queueName: QueueName, job: Job) {
  if (queueName === QUEUE_NAMES.paymentsWebhook) {
    return handlePaymentsWebhook(job);
  }

  if (queueName === QUEUE_NAMES.paymentsRecoverPending) {
    return handlePaymentsRecoverPending(job);
  }

  if (queueName === QUEUE_NAMES.ticketsIssue) {
    return handleTicketsIssue(job);
  }

  if (queueName === QUEUE_NAMES.halfPriceValidateDeadline) {
    return handleHalfPriceDeadline(job);
  }

  if (queueName === QUEUE_NAMES.cartsExpireAbandoned) {
    return handleCartsExpireAbandoned(job);
  }

  if (queueName === QUEUE_NAMES.waitlistInvite) {
    return handleWaitlistInvite(job);
  }

  if (queueName === QUEUE_NAMES.notificationsPlaceholder) {
    return handleNotificationsPlaceholder(job);
  }

  if (queueName === QUEUE_NAMES.checkinsSync) {
    return handleCheckinsSync(job);
  }

  if (queueName === QUEUE_NAMES.analyticsAggregate) {
    return handleAnalyticsAggregate(job);
  }

  if (queueName === QUEUE_NAMES.batchesProgressionCheck) {
    return handleBatchesProgressionCheck(job);
  }
}

export const workers = ACTIVE_QUEUE_NAMES.map((queueName) => {
  const worker = new Worker(
    queueName,
    async (job) => processJob(queueName, job),
    {
      connection: connection as any,
    }
  );

  worker.on('failed', async (job, err) => {
    logger.error({ err, queueName, jobId: job?.id, requestId: job?.data?.requestId }, 'worker job failed');
    captureException(err, { service: 'ticket-worker', queueName, jobId: job?.id, requestId: job?.data?.requestId });
    const configuredAttempts = job?.opts?.attempts ?? DEFAULT_JOB_OPTIONS.attempts ?? 5;
    if (job && job.attemptsMade >= configuredAttempts) {
      await moveJobToDeadLetter(queueName, job, err).catch((deadLetterError) => {
        logger.error({ err: deadLetterError, queueName, jobId: job.id }, 'failed to move job to dead-letter queue');
        captureException(deadLetterError, { service: 'ticket-worker', queueName, jobId: job.id, phase: 'deadLetter' });
      });
    }
  });

  return worker;
});

export async function closeWorkers() {
  await Promise.all([
    ...workers.map((worker) => worker.close()),
    connection.quit(),
  ]);
}
