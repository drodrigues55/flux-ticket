"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processOutbox = processOutbox;
const database_1 = require("@flux/database");
const queue_registry_1 = require("./queue-registry");
const dead_letter_1 = require("./dead-letter");
const logger_1 = require("./logger");
const sentry_1 = require("./sentry");
const OUTBOX_BATCH_SIZE = Number(process.env.OUTBOX_BATCH_SIZE || 100);
const MAX_OUTBOX_ATTEMPTS = Number(queue_registry_1.DEFAULT_JOB_OPTIONS.attempts || 5);
const RETRY_DELAY_MS = 5000;
function getOutboxType(event) {
    return event.type || event.aggregateType;
}
function getRetryAt(attempts) {
    const delay = RETRY_DELAY_MS * Math.pow(2, Math.max(attempts - 1, 0));
    return new Date(Date.now() + delay);
}
function getDelayForQueue(queueName) {
    if (queueName !== 'halfPrice.validateDeadline') {
        return 0;
    }
    return process.env.VALIDATION_DELAY_MS
        ? Number(process.env.VALIDATION_DELAY_MS)
        : 24 * 60 * 60 * 1000;
}
async function moveOutboxToDeadLetter(event, queueName, error, attempts) {
    if (!queueName)
        return;
    const err = error instanceof Error ? error : new Error(String(error));
    await queue_registry_1.deadLetterQueues[queueName].add('outbox-publish.dead', {
        originalQueue: queueName,
        outboxEventId: event.id,
        aggregateType: event.aggregateType,
        aggregateId: event.aggregateId,
        type: getOutboxType(event),
        payload: (0, dead_letter_1.sanitizePayload)(event.payload),
        failureReason: err.message,
        attempts,
        requestId: event.requestId ?? null,
        failedAt: new Date().toISOString(),
    }, {
        removeOnComplete: false,
        removeOnFail: false,
    });
}
async function processOutbox() {
    const now = new Date();
    const events = await database_1.prisma.outboxEvent.findMany({
        where: {
            status: 'PENDING',
            OR: [{ nextRunAt: null }, { nextRunAt: { lte: now } }],
        },
        take: OUTBOX_BATCH_SIZE,
        orderBy: { createdAt: 'asc' },
    });
    if (events.length > 0) {
        logger_1.logger.info({ queueName: 'outbox.publisher', count: events.length }, 'found due outbox events');
    }
    for (const event of events) {
        const payload = event.payload;
        const type = getOutboxType(event);
        const queueName = (0, queue_registry_1.resolveQueueForOutbox)(type, payload);
        try {
            if (!queueName) {
                logger_1.logger.info({ queueName: 'outbox.publisher', outboxEventId: event.id, type, requestId: event.requestId }, 'outbox event has no queue target');
                await database_1.prisma.outboxEvent.update({
                    where: { id: event.id },
                    data: {
                        status: 'PROCESSED',
                        processedAt: new Date(),
                        type,
                    },
                });
                continue;
            }
            await queue_registry_1.queues[queueName].add(type, {
                outboxEventId: event.id,
                aggregateType: event.aggregateType,
                aggregateId: event.aggregateId,
                type,
                payload,
                requestId: event.requestId ?? null,
            }, {
                jobId: event.id,
                delay: getDelayForQueue(queueName),
            });
            await database_1.prisma.outboxEvent.update({
                where: { id: event.id },
                data: {
                    status: 'PROCESSED',
                    processedAt: new Date(),
                    type,
                },
            });
        }
        catch (error) {
            const attempts = event.attempts + 1;
            logger_1.logger.error({ err: error, queueName, outboxEventId: event.id, type, requestId: event.requestId, attempts }, 'failed to publish outbox event');
            (0, sentry_1.captureException)(error, { service: 'ticket-worker', queueName: queueName || 'outbox.publisher', outboxEventId: event.id, requestId: event.requestId });
            if (attempts >= MAX_OUTBOX_ATTEMPTS) {
                await moveOutboxToDeadLetter(event, queueName, error, attempts).catch((deadLetterError) => {
                    logger_1.logger.error({ err: deadLetterError, queueName, outboxEventId: event.id }, 'failed to write outbox dead-letter');
                    (0, sentry_1.captureException)(deadLetterError, { service: 'ticket-worker', queueName: queueName || 'outbox.publisher', outboxEventId: event.id, phase: 'deadLetter' });
                });
                await database_1.prisma.outboxEvent.update({
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
            await database_1.prisma.outboxEvent.update({
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
//# sourceMappingURL=outbox-publisher.js.map