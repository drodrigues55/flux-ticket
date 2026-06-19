"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const queue_registry_1 = require("./queue-registry");
const outbox_publisher_1 = require("./outbox-publisher");
const workers_1 = require("./workers");
const pollIntervalMs = Number(process.env.OUTBOX_POLL_INTERVAL_MS || 5000);
async function shutdown(exitCode = 0) {
    console.log('[WORKER SYSTEM] Shutting down ticket-worker.');
    await (0, workers_1.closeWorkers)().catch((error) => console.error('[WORKER SYSTEM] Failed to close workers.', error));
    await (0, queue_registry_1.closeQueues)().catch((error) => console.error('[WORKER SYSTEM] Failed to close queues.', error));
    process.exit(exitCode);
}
async function bootstrap() {
    console.log('[WORKER SYSTEM] Starting ticket-worker.');
    console.log(`[WORKER SYSTEM] Active queues: ${queue_registry_1.ACTIVE_QUEUE_NAMES.join(', ')}.`);
    console.log(`[WORKER SYSTEM] Scaffold queues: ${queue_registry_1.SCAFFOLD_QUEUE_NAMES.join(', ')}.`);
    console.log(`[WORKER SYSTEM] Started ${workers_1.workers.length} BullMQ workers.`);
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
            console.error('[WORKER SYSTEM] Outbox publisher loop failed.', error);
        }
    }, pollIntervalMs);
}
process.on('SIGTERM', () => void shutdown(0));
process.on('SIGINT', () => void shutdown(0));
bootstrap().catch((error) => {
    console.error('[WORKER SYSTEM] Failed to start ticket-worker.', error);
    void shutdown(1);
});
//# sourceMappingURL=index.js.map