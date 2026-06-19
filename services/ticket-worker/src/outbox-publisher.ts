import { prisma } from '@flux/database';
import {
  DEFAULT_JOB_OPTIONS,
  QueueName,
  deadLetterQueues,
  queues,
  resolveQueueForOutbox,
} from './queue-registry';
import { sanitizePayload } from './dead-letter';

const OUTBOX_BATCH_SIZE = Number(process.env.OUTBOX_BATCH_SIZE || 100);
const MAX_OUTBOX_ATTEMPTS = Number(DEFAULT_JOB_OPTIONS.attempts || 5);
const RETRY_DELAY_MS = 5000;

function getOutboxType(event: { type?: string | null; aggregateType: string }) {
  return event.type || event.aggregateType;
}

function getRetryAt(attempts: number) {
  const delay = RETRY_DELAY_MS * Math.pow(2, Math.max(attempts - 1, 0));
  return new Date(Date.now() + delay);
}

function getDelayForQueue(queueName: QueueName) {
  if (queueName !== 'halfPrice.validateDeadline') {
    return 0;
  }

  return process.env.VALIDATION_DELAY_MS
    ? Number(process.env.VALIDATION_DELAY_MS)
    : 24 * 60 * 60 * 1000;
}

async function moveOutboxToDeadLetter(event: any, queueName: QueueName | null, error: unknown, attempts: number) {
  if (!queueName) return;

  const err = error instanceof Error ? error : new Error(String(error));
  await deadLetterQueues[queueName].add(
    'outbox-publish.dead',
    {
      originalQueue: queueName,
      outboxEventId: event.id,
      aggregateType: event.aggregateType,
      aggregateId: event.aggregateId,
      type: getOutboxType(event),
      payload: sanitizePayload(event.payload),
      failureReason: err.message,
      attempts,
      requestId: event.requestId ?? null,
      failedAt: new Date().toISOString(),
    },
    {
      removeOnComplete: false,
      removeOnFail: false,
    }
  );
}

export async function processOutbox() {
  const now = new Date();
  const events = await prisma.outboxEvent.findMany({
    where: {
      status: 'PENDING',
      OR: [{ nextRunAt: null }, { nextRunAt: { lte: now } }],
    },
    take: OUTBOX_BATCH_SIZE,
    orderBy: { createdAt: 'asc' },
  });

  if (events.length > 0) {
    console.log(`[PUBLISHER] Found ${events.length} due outbox events.`);
  }

  for (const event of events) {
    const payload = event.payload as any;
    const type = getOutboxType(event);
    const queueName = resolveQueueForOutbox(type, payload);

    try {
      if (!queueName) {
        console.log(`[PUBLISHER] Outbox ${event.id} (${type}) has no queue target. Marking processed for compatibility.`);
        await prisma.outboxEvent.update({
          where: { id: event.id },
          data: {
            status: 'PROCESSED',
            processedAt: new Date(),
            type,
          },
        });
        continue;
      }

      await queues[queueName].add(
        type,
        {
          outboxEventId: event.id,
          aggregateType: event.aggregateType,
          aggregateId: event.aggregateId,
          type,
          payload,
          requestId: event.requestId ?? null,
        },
        {
          jobId: event.id,
          delay: getDelayForQueue(queueName),
        }
      );

      await prisma.outboxEvent.update({
        where: { id: event.id },
        data: {
          status: 'PROCESSED',
          processedAt: new Date(),
          type,
        },
      });
    } catch (error) {
      const attempts = event.attempts + 1;
      console.error(`[PUBLISHER] Failed to publish outbox ${event.id} (${type}).`, error);

      if (attempts >= MAX_OUTBOX_ATTEMPTS) {
        await moveOutboxToDeadLetter(event, queueName, error, attempts).catch((deadLetterError) => {
          console.error(`[PUBLISHER] Failed to write dead-letter for outbox ${event.id}.`, deadLetterError);
        });

        await prisma.outboxEvent.update({
          where: { id: event.id },
          data: {
            status: 'DEAD',
            attempts,
            nextRunAt: null,
            type,
          },
        });
        continue;
      }

      await prisma.outboxEvent.update({
        where: { id: event.id },
        data: {
          attempts,
          nextRunAt: getRetryAt(attempts),
          type,
        },
      });
    }
  }
}
