"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const queue_registry_1 = require("./queue-registry");
const outbox_publisher_1 = require("./outbox-publisher");
const workers_1 = require("./workers");
const logger_1 = require("./logger");
const sentry_1 = require("./sentry");
const env_validation_1 = require("./env.validation");
const pollIntervalMs = Number(process.env.OUTBOX_POLL_INTERVAL_MS || 5000);
const version = process.env.SERVICE_VERSION || process.env.npm_package_version || '1.0.0';
async function shutdown(exitCode = 0) {
    logger_1.logger.info({ exitCode, version }, 'ticket-worker shutting down');
    await (0, workers_1.closeWorkers)().catch((error) => {
        logger_1.logger.error({ err: error }, 'failed to close workers');
        (0, sentry_1.captureException)(error, { service: 'ticket-worker', phase: 'shutdownWorkers' });
    });
    await (0, queue_registry_1.closeQueues)().catch((error) => {
        logger_1.logger.error({ err: error }, 'failed to close queues');
        (0, sentry_1.captureException)(error, { service: 'ticket-worker', phase: 'shutdownQueues' });
    });
    process.exit(exitCode);
}
async function bootstrap() {
    (0, env_validation_1.validateRuntimeEnv)();
    (0, sentry_1.initSentry)('ticket-worker');
    logger_1.logger.info({
        version,
        commit: process.env.GIT_COMMIT || null,
        APP_ENV: process.env.APP_ENV || process.env.NODE_ENV || 'development',
        activeQueues: queue_registry_1.ACTIVE_QUEUE_NAMES,
        scaffoldQueues: queue_registry_1.SCAFFOLD_QUEUE_NAMES,
        workerCount: workers_1.workers.length,
    }, 'ticket-worker started');
    if (process.env.WORKER_RUN_ONCE !== 'true') {
        await queue_registry_1.queues[queue_registry_1.QUEUE_NAMES.batchesProgressionCheck].add('batches.progressionCheck', {}, {
            repeat: { every: 60000 },
            jobId: 'batches-progression-check-cron',
        });
    }
    if (process.env.WORKER_RUN_ONCE === 'true') {
        await (0, outbox_publisher_1.processOutbox)();
        await new Promise((resolve) => setTimeout(resolve, Number(process.env.WORKER_ONCE_WAIT_MS || 1500)));
        await shutdown(0);
        return;
    }
    setInterval(async () => {
        try {
            await (0, outbox_publisher_1.processOutbox)();
        }
        catch (error) {
            logger_1.logger.error({ err: error }, 'outbox publisher loop failed');
            (0, sentry_1.captureException)(error, { service: 'ticket-worker', queueName: 'outbox.publisher' });
        }
    }, pollIntervalMs);
}
process.on('SIGTERM', () => void shutdown(0));
process.on('SIGINT', () => void shutdown(0));
bootstrap().catch((error) => {
    logger_1.logger.error({ err: error }, 'failed to start ticket-worker');
    (0, sentry_1.captureException)(error, { service: 'ticket-worker', phase: 'bootstrap' });
    void shutdown(1);
});
process.on('unhandledRejection', (reason) => {
    logger_1.logger.error({ err: reason }, 'unhandled rejection');
    (0, sentry_1.captureException)(reason, { service: 'ticket-worker', type: 'unhandledRejection' });
});
process.on('uncaughtException', (error) => {
    logger_1.logger.error({ err: error }, 'uncaught exception');
    (0, sentry_1.captureException)(error, { service: 'ticket-worker', type: 'uncaughtException' });
});
//# sourceMappingURL=index.js.map