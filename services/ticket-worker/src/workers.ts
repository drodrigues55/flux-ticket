import { prisma } from '@flux/database';
import { Job, Worker } from 'bullmq';
import { moveJobToDeadLetter } from './dead-letter';
import { createRedisConnection } from './redis';
import { ACTIVE_QUEUE_NAMES, DEFAULT_JOB_OPTIONS, QUEUE_NAMES, QueueName } from './queue-registry';
import { logger } from './logger';
import { captureException } from './sentry';

const connection = createRedisConnection();

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
  const paymentId = payload.paymentId?.toString();

  if (!paymentId) {
    logger.info({ queueName: QUEUE_NAMES.paymentsWebhook, jobId: job.id, requestId: job.data?.requestId }, 'payments webhook job has no paymentId');
    return;
  }

  const payment = await prisma.payment.findFirst({
    where: { providerPaymentId: paymentId },
  });

  if (!payment) {
    logger.warn({ queueName: QUEUE_NAMES.paymentsWebhook, jobId: job.id, requestId: job.data?.requestId, paymentId }, 'payment not found locally');
    return;
  }

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      rawPayload: {
        ...(typeof payment.rawPayload === 'object' && payment.rawPayload ? (payment.rawPayload as any) : {}),
        lastWebhook: payload,
      },
    },
  });
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

async function processJob(queueName: QueueName, job: Job) {
  if (queueName === QUEUE_NAMES.paymentsWebhook) {
    return handlePaymentsWebhook(job);
  }

  if (queueName === QUEUE_NAMES.ticketsIssue) {
    return handleTicketsIssue(job);
  }

  if (queueName === QUEUE_NAMES.halfPriceValidateDeadline) {
    return handleHalfPriceDeadline(job);
  }

  if (queueName === QUEUE_NAMES.checkinsSync) {
    return handleCheckinsSync(job);
  }

  if (queueName === QUEUE_NAMES.analyticsAggregate) {
    return handleAnalyticsAggregate(job);
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
