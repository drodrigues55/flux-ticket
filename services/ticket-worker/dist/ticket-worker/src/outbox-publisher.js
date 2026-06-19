"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processOutbox = processOutbox;
const database_1 = require("@flux/database");
const queue_registry_1 = require("./queue-registry");
const dead_letter_1 = require("./dead-letter");
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
        console.log(`[PUBLISHER] Found ${events.length} due outbox events.`);
    }
    for (const event of events) {
        const payload = event.payload;
        const type = getOutboxType(event);
        const queueName = (0, queue_registry_1.resolveQueueForOutbox)(type, payload);
        try {
            if (!queueName) {
                console.log(`[PUBLISHER] Outbox ${event.id} (${type}) has no queue target. Marking processed for compatibility.`);
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
            console.error(`[PUBLISHER] Failed to publish outbox ${event.id} (${type}).`, error);
            if (attempts >= MAX_OUTBOX_ATTEMPTS) {
                await moveOutboxToDeadLetter(event, queueName, error, attempts).catch((deadLetterError) => {
                    console.error(`[PUBLISHER] Failed to write dead-letter for outbox ${event.id}.`, deadLetterError);
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