import { closeQueues, ACTIVE_QUEUE_NAMES, SCAFFOLD_QUEUE_NAMES } from './queue-registry';
import { processOutbox } from './outbox-publisher';
import { closeWorkers, workers } from './workers';

const pollIntervalMs = Number(process.env.OUTBOX_POLL_INTERVAL_MS || 5000);

async function shutdown(exitCode = 0) {
  console.log('[WORKER SYSTEM] Shutting down ticket-worker.');
  await closeWorkers().catch((error) => console.error('[WORKER SYSTEM] Failed to close workers.', error));
  await closeQueues().catch((error) => console.error('[WORKER SYSTEM] Failed to close queues.', error));
  process.exit(exitCode);
}

async function bootstrap() {
  console.log('[WORKER SYSTEM] Starting ticket-worker.');
  console.log(`[WORKER SYSTEM] Active queues: ${ACTIVE_QUEUE_NAMES.join(', ')}.`);
  console.log(`[WORKER SYSTEM] Scaffold queues: ${SCAFFOLD_QUEUE_NAMES.join(', ')}.`);
  console.log(`[WORKER SYSTEM] Started ${workers.length} BullMQ workers.`);

  if (process.env.WORKER_RUN_ONCE === 'true') {
    await processOutbox();
    await new Promise((resolve) => setTimeout(resolve, Number(process.env.WORKER_ONCE_WAIT_MS || 1500)));
    await shutdown(0);
    return;
  }

  setInterval(async () => {
    try {
      await processOutbox();
    } catch (error) {
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
