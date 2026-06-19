import { prisma } from '@flux/database';
import { Job, Worker } from 'bullmq';
import { moveJobToDeadLetter } from './dead-letter';
import { createRedisConnection } from './redis';
import { ACTIVE_QUEUE_NAMES, DEFAULT_JOB_OPTIONS, QUEUE_NAMES, QueueName } from './queue-registry';

const connection = createRedisConnection();

async function handleHalfPriceDeadline(job: Job) {
  const payload = job.data?.payload ?? job.data;
  const { ticketId, batchId } = payload;

  if (!ticketId || !batchId) {
    console.log('[WORKER] halfPrice.validateDeadline job missing ticketId or batchId. Ignoring.');
    return;
  }

  console.log(`[WORKER] Checking half-price validation deadline for ticket ${ticketId}.`);

  await prisma.$transaction(async (tx) => {
    const ticket = await tx.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      console.log(`[WORKER] Ticket ${ticketId} was not found.`);
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
      console.log(`[WORKER] Ticket ${ticketId} is not half-price. Ignoring validation deadline.`);
      return;
    }

    if (ticket.status !== 'PENDING_VALIDATION') {
      console.log(`[WORKER] Ticket ${ticketId} is already ${ticket.status}. No deadline action needed.`);
      return;
    }

    if (ticket.hmacSignature) {
      console.log(`[WORKER] Half-price ticket ${ticketId} already has a signature. No deadline action needed.`);
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
    console.log('[WORKER] payments.webhook job has no paymentId. Persisted intake only.');
    return;
  }

  const payment = await prisma.payment.findFirst({
    where: { providerPaymentId: paymentId },
  });

  if (!payment) {
    console.log(`[WORKER] Payment ${paymentId} not found locally. No provider call will be made in Phase 3.`);
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
  console.log(`[WORKER] tickets.issue accepted job ${job.id}. External delivery remains out of scope for Phase 3.`);
}

async function handleCheckinsSync(job: Job) {
  console.log(`[WORKER] checkins.sync accepted job ${job.id}. Staff sync contracts start in Phase 4.`);
}

async function handleAnalyticsAggregate(job: Job) {
  console.log(`[WORKER] analytics.aggregate accepted job ${job.id}. Aggregation contracts start in Phase 4.`);
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
    console.error(`[WORKER] Job ${job?.id} failed on ${queueName}.`, err);
    const configuredAttempts = job?.opts?.attempts ?? DEFAULT_JOB_OPTIONS.attempts ?? 5;
    if (job && job.attemptsMade >= configuredAttempts) {
      await moveJobToDeadLetter(queueName, job, err).catch((deadLetterError) => {
        console.error(`[WORKER] Failed to move job ${job.id} to ${queueName}.dead.`, deadLetterError);
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
